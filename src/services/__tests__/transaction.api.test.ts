import apiClient from '../api-client'
import { TransactionApi } from '../transaction.api'

jest.mock('../api-client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('TransactionApi.importCsv', () => {
  beforeEach(() => {
    mockedApiClient.post.mockReset()
  })

  it('讀取檔案內容並以 JSON 送出 file/format/portfolioId', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: { successCount: 1, skippedCount: 0, errorCount: 0, errors: [] },
    })

    const csv = '日期,交易類別\n2026/6/2,買進'
    const file = new File([csv], 'export.csv', { type: 'text/csv' })

    await TransactionApi.importCsv(file, 'auto', 'p-1')

    expect(mockedApiClient.post).toHaveBeenCalledWith('/transactions/import', {
      file: csv,
      format: 'auto',
      portfolioId: 'p-1',
    })
  })
})
