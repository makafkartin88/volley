CREATE TYPE "public"."match_result" AS ENUM('win', 'loss');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('held', 'cancelled');--> statement-breakpoint
CREATE TABLE "attendance" (
	"training_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"guests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "attendance_training_id_player_id_pk" PRIMARY KEY("training_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "match_appearances" (
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "match_appearances_match_id_player_id_pk" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"opponent" text NOT NULL,
	"result" "match_result" NOT NULL,
	"score_text" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"settlement_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"amount_czk" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"note" text,
	CONSTRAINT "settlement_items_settlement_id_player_id_unique" UNIQUE("settlement_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"price_czk" integer DEFAULT 1350 NOT NULL,
	"status" "training_status" DEFAULT 'held' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainings_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_appearances" ADD CONSTRAINT "match_appearances_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_appearances" ADD CONSTRAINT "match_appearances_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;