import {
  pgTable, serial, text, integer, boolean, date, timestamp, primaryKey, unique, pgEnum,
} from 'drizzle-orm/pg-core'

export const trainingStatus = pgEnum('training_status', ['held', 'cancelled'])
export const matchResult = pgEnum('match_result', ['win', 'loss'])

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contact: text('contact'),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const trainings = pgTable('trainings', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  priceCzk: integer('price_czk').notNull().default(1350),
  status: trainingStatus('status').notNull().default('held'),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const attendance = pgTable('attendance', {
  trainingId: integer('training_id').notNull()
    .references(() => trainings.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  guests: integer('guests').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.trainingId, t.playerId] }),
}))

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  opponent: text('opponent').notNull(),
  result: matchResult('result').notNull(),
  scoreText: text('score_text'),
  note: text('note'),
})

export const matchAppearances = pgTable('match_appearances', {
  matchId: integer('match_id').notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.matchId, t.playerId] }),
}))

export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const settlementItems = pgTable('settlement_items', {
  id: serial('id').primaryKey(),
  settlementId: integer('settlement_id').notNull()
    .references(() => settlements.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull().references(() => players.id),
  amountCzk: integer('amount_czk').notNull(),
  paid: boolean('paid').notNull().default(false),
  paidAt: timestamp('paid_at'),
  note: text('note'),
}, (t) => ({
  uniquePlayerPerSettlement: unique().on(t.settlementId, t.playerId),
}))
