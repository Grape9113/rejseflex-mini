import { openDB } from 'idb'
export type Attachment = { name: string; blob: Blob }
export type Journey = { id: string; name: string; date: string; pickupAddress: string; departureDestination: string; pickupTime: string; departureStation: string; departureTime: string; interval: 15 | 30; arrivalStation: string; arrivalTime: string; arrivalPickupStation: string; destinationAddress: string; finalPickupTime: string; itinerary?: Attachment; ticket?: Attachment }
export const blank = (): Journey => ({ id: crypto.randomUUID(), name: '', date: '', pickupAddress: '', departureDestination: '', pickupTime: '', departureStation: '', departureTime: '', interval: 15, arrivalStation: '', arrivalTime: '', arrivalPickupStation: '', destinationAddress: '', finalPickupTime: '' })
export function meeting(time: string, interval: number) { if (!time) return ''; const [h,m] = time.split(':').map(Number); const total = (h*60+m-interval+1440)%1440; return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}` }
export const previousDay = (j: Journey) => !!j.departureTime && Number(j.departureTime.slice(0,2))*60+Number(j.departureTime.slice(3)) < j.interval
const db = openDB('rejseflex-mini', 1, { upgrade(db) { db.createObjectStore('journeys', { keyPath: 'id' }) } })
export const listJourneys = async (): Promise<Journey[]> => (await db).getAll('journeys')
export const saveJourney = async (j: Journey) => (await db).put('journeys', j)
export const deleteJourney = async (id: string) => (await db).delete('journeys', id)
