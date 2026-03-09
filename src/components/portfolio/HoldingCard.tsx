import React from 'react';
import { useNavigate } from 'react-router-dom';
import Decimal from 'decimal.js';
import { RiskBadge } from './RiskBadge';

interface HoldingCardProps {
  holding: {
    id: string;
    portfolioId: string;
    symbol: string;
    quantity: string | Decimal;
    averageCost: string | Decimal;
  };
  currentPrice?: Decimal;
  riskLevel?: 'low' | 'medium' | 'high';
  riskScore?: number;
}

export function HoldingCard({ holding, currentPrice, riskLevel, riskScore }: HoldingCardProps) {
  const navigate = useNavigate();
  
  const quantity = new Decimal(holding.quantity.toString());
  const averageCost = new Decimal(holding.averageCost.toString());
  const totalCost = quantity.mul(averageCost);
  
  let currentValue: Decimal | null = null;
  let unrealizedPL: Decimal | null = null;
  let plPercentage: Decimal | null = null;
  
  if (currentPrice) {
    currentValue = quantity.mul(currentPrice);
    unrealizedPL = currentValue.sub(totalCost);
    plPercentage = unrealizedPL.div(totalCost).mul(100);
  }

  const handleClick = () => {
    navigate(`/portfolios/${holding.portfolioId}/holdings/${holding.symbol}`);
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`查看 ${holding.symbol} 持股詳情`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{holding.symbol}</h3>
          <p className="text-sm text-gray-600">
            {quantity.toFixed()} 股 @ ${averageCost.toFixed(2)}
          </p>
        </div>
        {riskLevel && riskScore !== undefined && (
          <RiskBadge riskLevel={riskLevel} riskScore={riskScore} size="sm" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">成本總額</span>
          <span className="font-medium text-gray-900">${totalCost.toFixed(2)}</span>
        </div>
        
        {currentValue && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">目前市值</span>
            <span className="font-medium text-gray-900">${currentValue.toFixed(2)}</span>
          </div>
        )}
        
        {currentPrice && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">目前股價</span>
            <span className="font-medium text-gray-900">${currentPrice.toFixed(2)}</span>
          </div>
        )}
        
        {unrealizedPL && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-600">未實現損益</span>
            <div className="text-right">
              <div className={`font-bold ${
                unrealizedPL.isPositive() ? 'text-green-600' : 
                unrealizedPL.isNegative() ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {unrealizedPL.isPositive() ? '+' : ''}${unrealizedPL.toFixed(2)}
              </div>
              {plPercentage && (
                <div className={`text-xs ${
                  plPercentage.isPositive() ? 'text-green-600' : 
                  plPercentage.isNegative() ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  ({plPercentage.isPositive() ? '+' : ''}{plPercentage.toFixed(2)}%)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
