import { RouteObject } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'

import HomePage from '@/app/page'
import DashboardPage from '@/app/dashboard/page'
import PortfolioListPage from '@/app/portfolios/page'
import PortfolioDetailPage from '@/app/portfolios/[id]/page'
import HoldingDetailPage from '@/app/portfolios/[id]/holdings/[symbol]/page'
import TransactionListPage from '@/app/transactions/[portfolioId]/page'
import StrategyBuilderPage from '@/app/strategy-builder/page'
import TechnicalAnalysisPage from '@/app/technical-analysis/page'
import FibonacciToolPage from '@/app/fibonacci-tool/page'
import BacktestResultsPage from '@/app/backtest-results/[id]/page'
import LoginPage from '@/app/(auth)/login/page'
import RegisterPage from '@/app/(auth)/register/page'
import NotFoundPage from '@/app/not-found/page'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/portfolios', element: <PortfolioListPage /> },
      { path: '/portfolios/:id', element: <PortfolioDetailPage /> },
      { path: '/portfolios/:id/holdings/:symbol', element: <HoldingDetailPage /> },
      { path: '/transactions/:portfolioId', element: <TransactionListPage /> },
      { path: '/strategy-builder', element: <StrategyBuilderPage /> },
      { path: '/technical-analysis', element: <TechnicalAnalysisPage /> },
      { path: '/fibonacci-tool', element: <FibonacciToolPage /> },
      { path: '/backtest-results/:id', element: <BacktestResultsPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
