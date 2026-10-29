export interface Pickup {
  id: string
  label: string
  coils: number
  angle?: number
}
export interface Position {
  id: string
  label: string
  activePickups: string[]
}
export interface Tone {
  id: string
  label: string
  tracks: Record<string, string>
}
export interface Guitar {
  slug: string
  name: string
  titleLines: [string, string]
  configuration: string
  toneSummary: string
  subtitle: string
  imageNote?: string
  image: string
  imageAlt: string
  description: string
  pickups: Pickup[]
  positions: Position[]
  tones: Tone[]
  specs: { label: string; value: string }[]
  work?: string[]
  comments?: string[]
}
const positions: Position[] = [
  { id: '1', label: 'Bridge', activePickups: ['bridge'] },
  { id: '2', label: 'Bridge + Middle', activePickups: ['bridge', 'middle'] },
  { id: '3', label: 'Middle', activePickups: ['middle'] },
  { id: '4', label: 'Middle + Neck', activePickups: ['middle', 'neck'] },
  { id: '5', label: 'Neck', activePickups: ['neck'] },
]
function strat(slug: string, color: string, image: string): Guitar {
  return {
    slug,
    name: `${color} Stratocaster`,
    titleLines: [color, 'Stratocaster'],
    configuration: 'Stratocaster / SSS',
    toneSummary: 'Clean / Crunch',
    subtitle: 'Пять позиций. Два характера звука.',
    image,
    imageAlt: `${color} Stratocaster на стойке в светло-серой студии`,
    description: `Stratocaster в ${slug === 'black-strat' ? 'чёрном' : 'синем'} цвете с тремя синглами. Пять позиций переключателя — от Bridge до Neck. Послушайте каждую в Clean и Crunch.`,
    pickups: [
      { id: 'neck', label: 'Neck', coils: 1 },
      { id: 'middle', label: 'Middle', coils: 1 },
      { id: 'bridge', label: 'Bridge', coils: 1, angle: -10 },
    ],
    positions,
    tones: ['Clean', 'Crunch'].map((label) => ({
      id: label.toLowerCase(),
      label,
      tracks: Object.fromEntries(
        positions.map((p) => [p.id, `/audio/${slug}/${label.toLowerCase()}/${p.id}.mp3`]),
      ),
    })),
    specs: [
      { label: 'Форма', value: 'Stratocaster' },
      { label: 'Цвет', value: color },
      { label: 'Датчики', value: 'SSS · три сингла' },
      { label: 'Переключатель', value: '5 позиций' },
    ],
  }
}
export const guitars: Guitar[] = [
  strat('black-strat', 'Чёрный', '/images/black-strat-gray-studio.jpg'),
  strat('blue-strat', 'Синий', '/images/blue-gray-studio-light.png'),
  {
    slug: 'gibson-sg',
    name: 'Gibson SG',
    titleLines: ['Gibson', 'SG'],
    configuration: 'Gibson SG / HH',
    toneSummary: '3 положения',
    subtitle: 'Три положения. Два хамбакера.',
    image: '/images/gibson-sg.jpg',
    imageAlt: 'Gibson SG с двумя хамбакерами на стойке в серой студии',
    imageNote: 'Студийное изображение: фон заменён при подготовке демо.',
    description:
      'Gibson SG с двумя хамбакерами. Послушайте Bridge, Bridge + Neck и Neck. Отсечка бриджевого хамбакера в этих демо не записана.',
    pickups: [
      { id: 'neck', label: 'Neck', coils: 2 },
      { id: 'bridge', label: 'Bridge', coils: 2 },
    ],
    positions: [
      { id: '1', label: 'Bridge', activePickups: ['bridge'] },
      { id: '2', label: 'Bridge + Neck', activePickups: ['bridge', 'neck'] },
      { id: '3', label: 'Neck', activePickups: ['neck'] },
    ],
    tones: [
      {
        id: 'demo',
        label: 'Demo',
        tracks: {
          '1': '/audio/gibson-sg/1.mp3',
          '2': '/audio/gibson-sg/2.mp3',
          '3': '/audio/gibson-sg/3.mp3',
        },
      },
    ],
    specs: [
      { label: 'Модель', value: 'Gibson SG' },
      { label: 'Датчики', value: 'HH · два хамбакера' },
      { label: 'Переключатель', value: '3 положения' },
      { label: 'Отсечка', value: 'Бриджевый хамбакер → сингл; демо не записано' },
    ],
  },
]
