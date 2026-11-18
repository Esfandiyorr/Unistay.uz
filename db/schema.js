import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tours = sqliteTable('tours', {
  id: text().primaryKey(),
  title: text().notNull(),
  category: text().notNull(),
  location: text().notNull(),
  days: integer().notNull(),
  price: integer().notNull(),
  summary: text().notNull(),
  itinerary: text().notNull(),
  included: text().notNull(),
  image: text().notNull(),
  sample: integer({ mode: 'boolean' }).notNull().default(false),
  published: integer({ mode: 'boolean' }).notNull().default(true),
  sort_order: integer().notNull().default(0),
  created_at: text().notNull(),
}, (table) => [
  check('tour_category', sql`${table.category} IN ('domestic', 'international')`),
  check('tour_days', sql`${table.days} BETWEEN 1 AND 30`),
  check('tour_price', sql`${table.price} BETWEEN 1000 AND 1000000000`),
]);

export const bookings = sqliteTable('bookings', {
  code: text().primaryKey(),
  tour_id: text().notNull().references(() => tours.id),
  tour_title: text().notNull(),
  date: text().notNull(),
  people: integer().notNull(),
  customer: text().notNull(),
  phone: text().notNull(),
  total: integer().notNull(),
  sample: integer({ mode: 'boolean' }).notNull(),
  status: text().notNull().default('pending'),
  paid: integer({ mode: 'boolean' }).notNull().default(false),
  created_at: text().notNull(),
}, (table) => [
  check('booking_status', sql`${table.status} IN ('pending', 'confirmed', 'cancelled')`),
  check('booking_people', sql`${table.people} BETWEEN 1 AND 20`),
  index('bookings_by_date').on(table.created_at),
]);

export const settings = sqliteTable('site_settings', {
  key: text().primaryKey(),
  value: text().notNull(),
});
