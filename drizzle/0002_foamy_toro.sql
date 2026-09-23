CREATE TABLE "avl_config" (
	"id" integer PRIMARY KEY NOT NULL,
	"league_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avl_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"opponent" text NOT NULL,
	"result" "match_result" NOT NULL,
	"score_text" text NOT NULL,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "avl_suggestions_date_opponent_score_text_unique" UNIQUE("date","opponent","score_text")
);
