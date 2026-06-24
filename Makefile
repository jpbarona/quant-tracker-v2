.PHONY: local test

local:
	npm install
	VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= VITE_LOCAL_DUMMY_DATA=1 VITE_LOCAL_DUMMY_SESSION=$$(date +%s) npm run dev

test:
	npm install
	npm test
	node scripts/test-cloudflare-build.mjs
	node scripts/verify-local-dummy-not-in-prod.mjs
