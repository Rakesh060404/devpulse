import {
    verifyWebhookSignature,
    processPushEvent,
    processPREvent,
    processPingEvent
} from '../services/webhookService.js';

/**
 * Handles GitHub webhook events
 * POST /api/webhooks/github
 */
export const handleGitHubWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-hub-signature-256'];
        const eventType = req.headers['x-github-event'];
        const deliveryId = req.headers['x-github-delivery'];

        // Get raw body for signature verification (captured by middleware in app.js)
        const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

        // Verify webhook signature
        const isValidSignature = verifyWebhookSignature(
            signature,
            rawBody,
            process.env.WEBHOOK_SECRET
        );

        if (!isValidSignature) {
            console.warn(`Invalid webhook signature for delivery: ${deliveryId}`);
            return res.status(401).json({
                error: 'Invalid webhook signature'
            });
        }

        console.log(`Processing webhook event: ${eventType}, delivery: ${deliveryId}`);

        let result;

        // Process event based on type
        switch (eventType) {
            case 'push':
                result = await processPushEvent(req.body);
                break;

            case 'pull_request':
                result = await processPREvent(req.body);
                break;

            case 'ping':
                result = await processPingEvent(req.body);
                break;

            default:
                console.log(`Unhandled event type: ${eventType}`);
                return res.status(200).json({
                    message: `Event type '${eventType}' received but not processed`
                });
        }

        // Log successful processing
        console.log(`Webhook processed successfully:`, {
            eventType,
            deliveryId,
            result
        });

        res.status(200).json({
            message: 'Webhook processed successfully',
            eventType,
            deliveryId,
            result
        });

    } catch (error) {
        console.error('Webhook processing error:', error);

        res.status(500).json({
            error: 'Failed to process webhook',
            deliveryId: req.headers['x-github-delivery']
        });
    }
};