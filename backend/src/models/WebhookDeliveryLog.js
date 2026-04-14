import mongoose from 'mongoose';

const webhookDeliveryLogSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    url: { type: String, required: true },
    attempt: { type: Number, required: true, min: 1, max: 3 },
    statusCode: { type: Number },
    success: { type: Boolean, required: true },
    errorMessage: { type: String, default: '' },
    responseSnippet: { type: String, default: '' },
  },
  { timestamps: true }
);

export const WebhookDeliveryLog = mongoose.model('WebhookDeliveryLog', webhookDeliveryLogSchema);
