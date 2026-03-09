/**
 * SupportResistanceLines Component Example
 * 
 * This example demonstrates how to use the SupportResistanceLines component
 * to display support and resistance levels on a price chart.
 * 
 * Requirements: 7.4, 7.5, 7.6
 */

import { useState, useEffect } from 'react'
import SupportResistanceLines, { PriceLevel } from './SupportResistanceLines'
import Decimal from 'decimal.js'

export default function SupportResistanceLinesExample() {
  const [priceData, setPriceData] = useState<Array<{ date: string; price: number }>>([])
  const [supports, setSupports] = useState<PriceLevel[]>([])
  const [resistances, setResistances] = useState<PriceLevel[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [nearestSupport, setNearestSupport] = useState<PriceLevel | undefined>()
  const [nearestResistance, setNearestResistance] = useState<PriceLevel | undefined>()

  useEffect(() => {
    // Generate sample price data
    const generatePriceData = () => {
      const data: Array<{ date: string; price: number }> = []
      let price = 100
      const startDate = new Date('2024-01-01')

      for (let i = 0; i < 90; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Simulate price movement with some volatility
        const change = (Math.random() - 0.5) * 4
        price = Math.max(85, Math.min(115, price + change))
        
        data.push({
          date: date.toISOString().split('T')[0],
          price: Number(price.toFixed(2)),
        })
      }

      return data
    }

    const data = generatePriceData()
    setPriceData(data)

    // Calculate support and resistance levels
    const prices = data.map(d => d.price)
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const current = prices[prices.length - 1]

    setCurrentPrice(current)

    // Generate support levels
    const supportLevels: PriceLevel[] = [
      {
        price: low,
        strength: 'strong',
        touches: 5,
        type: 'support',
      },
      {
        price: low + (high - low) * 0.236,
        strength: 'moderate',
        touches: 3,
        type: 'support',
      },
      {
        price: low + (high - low) * 0.382,
        strength: 'weak',
        touches: 2,
        type: 'support',
      },
    ]

    // Generate resistance levels
    const resistanceLevels: PriceLevel[] = [
      {
        price: high,
        strength: 'strong',
        touches: 4,
        type: 'resistance',
      },
      {
        price: low + (high - low) * 0.786,
        strength: 'moderate',
        touches: 3,
        type: 'resistance',
      },
      {
        price: low + (high - low) * 0.618,
        strength: 'weak',
        touches: 2,
        type: 'resistance',
      },
    ]

    setSupports(supportLevels)
    setResistances(resistanceLevels)

    // Find nearest support and resistance
    const supportsBelow = supportLevels.filter(s => s.price < current)
    if (supportsBelow.length > 0) {
      const nearest = supportsBelow.reduce((prev, curr) => 
        curr.price > prev.price ? curr : prev
      )
      setNearestSupport(nearest)
    }

    const resistancesAbove = resistanceLevels.filter(r => r.price > current)
    if (resistancesAbove.length > 0) {
      const nearest = resistancesAbove.reduce((prev, curr) => 
        curr.price < prev.price ? curr : prev
      )
      setNearestResistance(nearest)
    }
  }, [])

  if (priceData.length === 0) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">支撐壓力位元件範例</h1>
        <p className="text-gray-600">
          此元件展示如何在價格圖表上繪製支撐壓力線，並區分強支撐/壓力區域
        </p>
      </div>

      {/* Main chart */}
      <SupportResistanceLines
        data={priceData}
        supports={supports}
        resistances={resistances}
        currentPrice={currentPrice}
        nearestSupport={nearestSupport}
        nearestResistance={nearestResistance}
        title="支撐壓力位分析"
        height={500}
      />

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📊 價格圖表繪製</h3>
          <p className="text-sm text-blue-700">
            在價格圖表上清晰繪製支撐壓力線，使用不同顏色和線條樣式區分
          </p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">💪 強度區分</h3>
          <p className="text-sm text-green-700">
            根據觸及次數和合併情況，區分強、中、弱三種強度的支撐壓力區域
          </p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">🎯 最近價位高亮</h3>
          <p className="text-sm text-purple-700">
            自動識別並高亮顯示最接近當前價格的支撐和壓力位
          </p>
        </div>
      </div>

      {/* Requirements mapping */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">需求對應</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <span className="font-medium">需求 7.4:</span> 當多個支撐或壓力位接近（價格差異小於 3%）時，
            系統會合併為強支撐或強壓力區域，並使用更粗的線條和更深的顏色顯示
          </li>
          <li>
            <span className="font-medium">需求 7.5:</span> 當目前股價接近支撐或壓力位時，
            系統會高亮顯示該價位，使用虛線樣式和加粗字體
          </li>
          <li>
            <span className="font-medium">需求 7.6:</span> 在價格圖表上標示所有關鍵價位，
            包括支撐位（綠色）和壓力位（紅色），並顯示詳細的價位列表
          </li>
        </ul>
      </div>

      {/* Usage example */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">使用範例</h3>
        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`import SupportResistanceLines from '@/components/charts/SupportResistanceLines'
import { SupportResistanceService } from '@/services/support-resistance.service'

// Calculate support and resistance levels
const service = new SupportResistanceService()
const levels = service.calculateLevels(prices, [30, 60, 90], currentPrice)

// Prepare data for chart
const priceData = historicalData.map(d => ({
  date: d.date,
  price: d.close.toNumber()
}))

const supports = levels.supports.map(s => ({
  price: s.price.toNumber(),
  strength: s.strength,
  touches: s.touches,
  type: 'support' as const
}))

const resistances = levels.resistances.map(r => ({
  price: r.price.toNumber(),
  strength: r.strength,
  touches: r.touches,
  type: 'resistance' as const
}))

// Render component
<SupportResistanceLines
  data={priceData}
  supports={supports}
  resistances={resistances}
  currentPrice={currentPrice.toNumber()}
  nearestSupport={levels.currentNearestSupport ? {
    price: levels.currentNearestSupport.price.toNumber(),
    strength: levels.currentNearestSupport.strength,
    touches: levels.currentNearestSupport.touches,
    type: 'support'
  } : undefined}
  nearestResistance={levels.currentNearestResistance ? {
    price: levels.currentNearestResistance.price.toNumber(),
    strength: levels.currentNearestResistance.strength,
    touches: levels.currentNearestResistance.touches,
    type: 'resistance'
  } : undefined}
/>`}
        </pre>
      </div>
    </div>
  )
}
