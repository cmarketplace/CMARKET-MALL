import {
  AirVent,
  Bath,
  Bug,
  Coffee,
  Container,
  Cookie,
  CupSoda,
  Droplets,
  FireExtinguisher,
  Flower2,
  GlassWater,
  Heater,
  Layers,
  Printer,
  Shirt,
  Shredder,
  Snowflake,
  SprayCan,
  Wind,
  type LucideIcon,
} from 'lucide-react'

/** 서비스 key → 아이콘. 랜딩과 몰이 같은 그림을 쓴다. 없는 key 는 스프레이로. */
const SERVICE_ICONS: Record<string, LucideIcon> = {
  'office-cleaning': SprayCan,
  'restroom-cleaning': Bath,
  'aircon-cleaning': AirVent,
  'pest-control': Bug,
  'entrance-mat': Layers,
  'water-tank-cleaning': Container,
  'water-purifier': Droplets,
  'ice-maker': Snowflake,
  bidet: Bath,
  'air-purifier': Wind,
  copier: Printer,
  'coffee-machine': Coffee,
  'snack-box': Cookie,
  'pantry-supplies': CupSoda,
  'bottled-water': GlassWater,
  'document-shredding': Shredder,
  'plant-care': Flower2,
  'uniform-laundry': Shirt,
  'hvac-inspection': Heater,
  'fire-safety': FireExtinguisher,
}

export function serviceIcon(key: string): LucideIcon {
  return SERVICE_ICONS[key] ?? SprayCan
}
