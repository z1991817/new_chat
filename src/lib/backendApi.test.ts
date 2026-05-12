import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../types'
import { createBananaImage, createImageToImage, createTextToImage } from './backendApi'

const taskEnvelope = {
  code: 202,
  data: {
    upload: {
      taskId: 'task-1',
      queryPath: '/app/text-to-image/tasks/task-1',
    },
  },
}

function mockTaskFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(taskEnvelope), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  }))
}

function getJsonBody(fetchMock: ReturnType<typeof mockTaskFetch>) {
  const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  const init = lastCall?.[1] as RequestInit | undefined
  return JSON.parse(String(init?.body))
}

describe('backend image task creation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends promptOptimizeStatus on text-to-image requests', async () => {
    const fetchMock = mockTaskFetch()

    await createTextToImage(DEFAULT_SETTINGS, 'token', {
      prompt: 'A cat',
      aspectRatio: '1:1',
      imageSize: '1K',
      model: 'gpt-image-2',
      negativePromptEnabled: true,
      uploadToCos: true,
      idempotencyKey: 'request-1',
    })

    expect(getJsonBody(fetchMock)).toMatchObject({
      negativePromptEnabled: true,
      promptOptimizeStatus: 1,
    })
  })

  it('sends promptOptimizeStatus on image-to-image requests', async () => {
    const fetchMock = mockTaskFetch()

    await createImageToImage(DEFAULT_SETTINGS, 'token', {
      prompt: 'A cat',
      aspectRatio: '1:1',
      imageSize: '1K',
      model: 'gpt-image-2',
      imageUrl: ['/appTempData/input.png'],
      negativePromptEnabled: false,
      uploadToCos: true,
      idempotencyKey: 'request-2',
    })

    expect(getJsonBody(fetchMock)).toMatchObject({
      negativePromptEnabled: false,
      promptOptimizeStatus: 0,
    })
  })

  it('sends promptOptimizeStatus on banana image requests', async () => {
    const fetchMock = mockTaskFetch()

    await createBananaImage(DEFAULT_SETTINGS, 'token', {
      type: 'text-to-image',
      model: 'gemini-2.5-flash-image-preview',
      prompt: 'A cat',
      aspectRatio: '1:1',
      imageSize: '1K',
      negativePromptEnabled: true,
      idempotencyKey: 'request-3',
    })

    expect(getJsonBody(fetchMock)).toMatchObject({
      negativePromptEnabled: true,
      promptOptimizeStatus: 1,
    })
  })
})
