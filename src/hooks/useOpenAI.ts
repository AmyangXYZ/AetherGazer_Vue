import OpenAI from 'openai'
import { ref } from 'vue'
import { OpenAI_API_KEY } from './useStates'

export function useOpenAI() {
  let openai: OpenAI

  const prompt = ref('')
  const response = ref<string | null>(null)
  const send = async () => {
    if (openai == undefined) {
      openai = new OpenAI({
        apiKey: OpenAI_API_KEY.value,
        dangerouslyAllowBrowser: true
      })
    }
    response.value = ''
    const timer = setInterval(() => {
      response.value += '.'
    }, 150)

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: prompt.value }],
      model: 'gpt-3.5-turbo'
    })
    prompt.value = ''

    clearInterval(timer)
    response.value = completion.choices[0].message.content

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: response.value!
    })
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(await mp3.arrayBuffer())
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)
    source.start()
  }
  return { prompt, send, response }
}
