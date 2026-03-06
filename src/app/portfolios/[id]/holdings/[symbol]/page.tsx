import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Decimal from 'decimal.js';
import { RiskAssessmentPanel } from '@/components/portfolio/RiskAssessmentPanel';
import { HoldingAdvicePanel } from '@/components/portfolio/HoldingAdvicePanel';
import { NewsList } from '@/components/news/NewsList';
import { DisclaimerNotice } from '@/components/ui/DisclaimerNotice';
import { InsufficientDataNotice } from '@/components/portfolio/InsufficientDataNotice';

export default function HoldingDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string; symbol: string }>();
  const portfolioId = params.id!;
  const symbol = params.symbol!;
  const [holding, setHolding] = useState<any>(null);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [holdingAdvice, setHoldingAdvice] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch(`/api/news/${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setNews(data.data?.news || []);
      } else {
        const errData = await res.json().catch(() => null);
        if (res.status === 500 && errData?.error?.includes('API Key')) {
          setNewsError('Finnhub API Key 未設定，無法載入個股新聞');
        } else if (res.status === 503) {
          setNewsError('新聞服務暫時不可用，請稍後再試');
        } else {
          setNewsError('載入 Finnhub 新聞失敗');
        }
      }
    } catch {
      setNewsError('載入 Finnhub 新聞失敗');
    } finally {
      setNewsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [holdingRes, riskRes, adviceRes] = await Promise.allSettled([
          fetch(`/api/portfolios/${portfolioId}/holdings`),
          fetch(`/api/risk-assessment/${symbol}`),
          fetch(`/api/holding-advice/${symbol}`),
        ]);

        if (holdingRes.status === 'fulfilled' && holdingRes.value.ok) {
          const data = await holdingRes.value.json();
          const foundHolding = data.holdings?.find((h: any) => h.symbol === symbol);
          if (foundHolding) {
            setHolding(foundHolding);
          } else {
            setError('找不到此持股');
          }
        }

        if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
          const data = await riskRes.value.json();
          setRiskAssessment(data);
        }

        if (adviceRes.status === 'fulfilled' && adviceRes.value.ok) {
          const data = await adviceRes.value.json();
          setHoldingAdvice(data.data ?? null);
        }
      } catch (err) {
        console.error('Error fetching holding details:', err);
        setError('載入資料時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchNews();
  }, [portfolioId, symbol, fetchNews]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !holding) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-300">{error || '找不到持股資料'}</p>
          <button
            onClick={() => navigate(`/portfolios/${portfolioId}`)}
            className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
          >
            返回投資組合
          </button>
        </div>
      </div>
    );
  }

  const quantity = new Decimal(holding.quantity.toString());
  const averageCost = new Decimal(holding.averageCost.toString());
  const totalCost = quantity.mul(averageCost);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-gray-50 dark:bg-gray-900 min-h-screen">
      <button
        onClick={() => navigate(`/portfolios/${portfolioId}`)}
        className="mb-6 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2"
      >
        <span>←</span>
        <span>返回投資組合</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{symbol}</h1>
        <div className="flex gap-6 text-gray-600 dark:text-gray-400">
          <div>
            <span className="text-sm">持有股數：</span>
            <span className="font-medium">{quantity.toFixed()} 股</span>
          </div>
          <div>
            <span className="text-sm">平均成本：</span>
            <span className="font-medium">${averageCost.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-sm">成本總額：</span>
            <span className="font-medium">${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          {riskAssessment ? (
            <RiskAssessmentPanel assessment={riskAssessment} />
          ) : (
            <InsufficientDataNotice symbol={symbol} />
          )}
        </div>

        <div>
          {holdingAdvice ? (
            <>
              <HoldingAdvicePanel 
                symbol={symbol}
                adviceType={holdingAdvice.adviceType}
                reasons={holdingAdvice.reasons}
                confidence={holdingAdvice.confidence}
                generatedAt={new Date(holdingAdvice.generatedAt)}
              />
              <div className="mt-4">
                <DisclaimerNotice />
              </div>
            </>
          ) : (
            <InsufficientDataNotice symbol={symbol} />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-transparent dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">相關新聞</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">來源：Finnhub</span>
        </div>
        {newsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">載入新聞中…</p>
          </div>
        ) : newsError ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">{newsError}</p>
            <button
              onClick={fetchNews}
              className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              重試
            </button>
          </div>
        ) : news.length > 0 ? (
          <NewsList news={news} />
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">目前沒有相關新聞</p>
        )}
      </div>
    </div>
  );
}
