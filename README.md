# Axiso Green Energy CRM

A project management CRM system for Axiso Green Energy, built with React, TypeScript, and Supabase.

## Features

- Dashboard with key metrics and project statistics
- Project management with stage tracking
- Customer information management
- Financial tracking with payment management
- Reports and analytics
- Project stage progression tracking

## Project Stages

1. Advance payment done
2. Site measurement done
3. Design finalized
4. Material ordered
5. Material received
6. Production started
7. Production completed
8. Quality check done
9. Packing done
10. Dispatch done
11. Reached site
12. Installation started
13. Installation completed
14. Cleaning done
15. Site handover done
16. Balance payment received
17. Completion document shared
18. Warranty card shared
19. Customer feedback taken
20. Final payment(done)/completed

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## Database Setup

1. Create a new project in Supabase
2. Run the migration script in `supabase/migrations/20240127000000_create_tables.sql`

## Technologies Used

- React
- TypeScript
- Chakra UI
- Supabase
- React Router

## Development

To start the development server:

```bash
npm start
```

To build for production:

```bash
npm run build
```
