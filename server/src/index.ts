import dotenv from 'dotenv';
import path from 'path';
import { createApp } from './app';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const PORT = Number(process.env.PORT || process.env.STRAVA_PROXY_PORT || 8787);
const app = createApp();

app.listen(PORT, () => {
  console.log(`paddleerg server listening on http://localhost:${PORT}`);
});
