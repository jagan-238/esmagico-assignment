import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    webhookUrl: { type: String, default: '' },
    webhookEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

projectSchema.index({ ownerId: 1 });
projectSchema.index({ 'members.userId': 1 });

projectSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    ownerId: this.ownerId.toString(),
    members: this.members.map((m) => ({
      userId: m.userId.toString(),
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    webhookEnabled: this.webhookEnabled,
    webhookUrl: this.webhookUrl || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Project = mongoose.model('Project', projectSchema);
