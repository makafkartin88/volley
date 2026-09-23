CREATE TABLE "settlement_expense_participants" (
	"expense_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "settlement_expense_participants_expense_id_player_id_pk" PRIMARY KEY("expense_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "settlement_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"settlement_id" integer NOT NULL,
	"note" text NOT NULL,
	"amount_czk" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settlement_items" ADD COLUMN "player_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "settlement_expense_participants" ADD CONSTRAINT "settlement_expense_participants_expense_id_settlement_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."settlement_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_expense_participants" ADD CONSTRAINT "settlement_expense_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_expenses" ADD CONSTRAINT "settlement_expenses_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;