import 'dotenv/config';
import { z } from 'zod';

const EnvSceama = z.object({
    Node_Env: z.enum(['development', 'production', 'test']).default('development'),
})