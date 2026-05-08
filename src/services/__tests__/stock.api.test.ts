import apiClient from '../api-client'
import { StockApi } from '../stock.api'

jest.mock('../api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('StockApi', () => {
  beforeEach(() => {
    mockedApiClient.get.mockReset()
  })

  it('searches stocks with the query parameter expected by the backend route', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { stocks: [] } })

    await StockApi.search('2330')

    expect(mockedApiClient.get).toHaveBeenCalledWith('/stocks/search', {
      params: { q: '2330' },
    })
  })
})
