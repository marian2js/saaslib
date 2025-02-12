import { ConversationVisibility } from '../types/conversation.types'
import { useCreateConversation, useFetchConversation, useFetchConversations } from './conversation.hooks'
import { useApiCallback, useApiFetch } from './fetch.hooks'

jest.mock('./fetch.hooks')

describe('conversation.hooks', () => {
  const mockUseApiFetch = useApiFetch as jest.MockedFunction<typeof useApiFetch>
  const mockUseApiCallback = useApiCallback as jest.MockedFunction<typeof useApiCallback>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useFetchConversations', () => {
    it('should call useApiFetch with correct endpoint', () => {
      const mockResult = {
        data: { items: [] },
        loading: false,
        error: null,
        refetch: jest.fn(),
      }
      mockUseApiFetch.mockReturnValue(mockResult)

      const result = useFetchConversations()
      expect(mockUseApiFetch).toHaveBeenCalledWith('/conversations')
      expect(result).toBe(mockResult)
    })
  })

  describe('useFetchConversation', () => {
    it('should call useApiFetch with correct endpoint', () => {
      const mockResult = {
        data: { item: {} },
        loading: false,
        error: null,
        refetch: jest.fn(),
      }
      mockUseApiFetch.mockReturnValue(mockResult)

      const result = useFetchConversation('123')
      expect(mockUseApiFetch).toHaveBeenCalledWith('/conversations/123')
      expect(result).toBe(mockResult)
    })
  })

  describe('useCreateConversation', () => {
    const mockCallback = jest.fn()

    beforeEach(() => {
      mockUseApiCallback.mockReturnValue({
        callback: mockCallback,
        loading: false,
        error: null,
        success: false,
      })
    })

    it('should return createConversation function with loading and error states', () => {
      const { createConversation, loading, error } = useCreateConversation()

      expect(typeof createConversation).toBe('function')
      expect(loading).toBe(false)
      expect(error).toBe(null)
    })

    it('should create conversation with default visibility', async () => {
      const mockConversation = { id: '1' }
      mockCallback.mockResolvedValueOnce({ item: mockConversation })

      const { createConversation } = useCreateConversation()
      const result = await createConversation('test prompt')

      expect(result).toEqual(mockConversation)
      expect(mockCallback).toHaveBeenCalledWith('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          visibility: ConversationVisibility.Private,
        }),
      })
    })

    it('should create conversation with custom visibility', async () => {
      const mockConversation = { id: '1' }
      mockCallback.mockResolvedValueOnce({ item: mockConversation })

      const { createConversation } = useCreateConversation()
      const result = await createConversation('test prompt', ConversationVisibility.Public)

      expect(result).toEqual(mockConversation)
      expect(mockCallback).toHaveBeenCalledWith('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test prompt',
          visibility: ConversationVisibility.Public,
        }),
      })
    })

    it('should handle null response', async () => {
      mockCallback.mockResolvedValueOnce(null)

      const { createConversation } = useCreateConversation()
      const result = await createConversation('test prompt')

      expect(result).toBeUndefined()
    })
  })
})
