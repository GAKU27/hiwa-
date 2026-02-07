
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we are running in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class AIWorker {
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
                progress_callback
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { type, payload } = event.data;

    try {
        if (type === 'init') {
            // Initialize model
            await AIWorker.getInstance((data) => {
                // Send progress back to main thread
                self.postMessage({
                    status: 'progress',
                    data: data
                });
            });
            self.postMessage({ status: 'ready' });

        } else if (type === 'analyze') {
            const { text1, text2 } = payload;
            const pipe = await AIWorker.getInstance();

            // Compute embeddings
            // We need to add "query: " and "passage: " prefixes for e5 models ideally,
            // or at least be consistent. For similarity, purely raw text is also okay 
            // but usually 'query: ' for input and 'passage: ' for targets is recommended.
            // Here we treat both as symmetric for simple similarity.

            const output1 = await pipe(text1, { pooling: 'mean', normalize: true });
            const output2 = await pipe(text2, { pooling: 'mean', normalize: true });

            const vector1 = output1.data;
            const vector2 = output2.data;

            // Calculate cosine similarity
            let dotProduct = 0;
            for (let i = 0; i < vector1.length; i++) {
                dotProduct += vector1[i] * vector2[i];
            }

            // Vectors are already normalized by the pipeline
            const similarity = dotProduct;

            self.postMessage({
                status: 'complete',
                result: similarity
            });
        }
    } catch (err) {
        self.postMessage({
            status: 'error',
            data: err.message
        });
    }
});
