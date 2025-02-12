import { fetchWithAuth } from '../utils/fetch.utils'
import { createConversation, fetchConversation, fetchConversations } from './conversation.service'

jest.mock('../utils/fetch.utils')

describe('conversation.service', () => {
  const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchConversations', () => {
    it('should fetch conversations', async () => {
      const mockConversations = [{ id: '1' }, { id: '2' }]
      mockFetchWithAuth.mockResolvedValueOnce({ items: mockConversations })

      const result = await fetchConversations()

      expect(result).toEqual(mockConversations)
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/conversations')
    })

    it('should handle errors', async () => {
      const error = new Error('Network error')
      mockFetchWithAuth.mockRejectedValueOnce(error)

      await expect(fetchConversations()).rejects.toThrow('Network error')
    })
  })

  describe('fetchConversation', () => {
    it('should fetch a single conversation', async () => {
      const mockConversation = { id: '1', messages: [] }
      mockFetchWithAuth.mockResolvedValueOnce({ item: mockConversation })

      const result = await fetchConversation('1')

      expect(result).toEqual(mockConversation)
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/conversations/1')
    })

    it('should handle errors', async () => {
      const error = new Error('Not found')
      mockFetchWithAuth.mockRejectedValueOnce(error)

      await expect(fetchConversation('999')).rejects.toThrow('Not found')
    })
  })

  describe('createConversationWithPrompt', () => {
    it('should create a conversation with default visibility', async () => {
      const mockConversation = { id: '1' }
      mockFetchWithAuth.mockResolvedValueOnce({ item: mockConversation })

      const result = await createConversation('test prompt')

      expect(result).toEqual(mockConversation)
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          visibility: 'private',
        }),
      })
    })

    it('should create a conversation with custom visibility', async () => {
      const mockConversation = { id: '1' }
      mockFetchWithAuth.mockResolvedValueOnce({ item: mockConversation })

      const result = await createConversation('test prompt', 'public')

      expect(result).toEqual(mockConversation)
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          visibility: 'public',
        }),
      })
    })

    it('should handle errors', async () => {
      const error = new Error('Invalid prompt')
      mockFetchWithAuth.mockRejectedValueOnce(error)

      await expect(createConversation('')).rejects.toThrow('Invalid prompt')
    })
  })
})
