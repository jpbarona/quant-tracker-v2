.PHONY: local

local:
	npm install
	VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev
