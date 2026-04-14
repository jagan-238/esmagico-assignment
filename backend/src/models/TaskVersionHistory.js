import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    priority: Number,
    estimatedHours: Number,
    status: String,
    dependencies: [String],
    resourceTag: String,
    maxRetries: Number,
    retryCount: Number,
  },
  { _id: false }
);

const taskVersionHistorySchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    versionNumber: { type: Number, required: true },
    snapshot: { type: snapshotSchema, required: true },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taskVersionHistorySchema.index({ taskId: 1, versionNumber: -1 });

export const TaskVersionHistory = mongoose.model('TaskVersionHistory', taskVersionHistorySchema);
