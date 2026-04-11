import { Schema, Types, model, type InferSchemaType } from 'mongoose';

import Photo from './Photo.model';

const commentSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photo: {
      type: Schema.Types.ObjectId,
      ref: 'Photo',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: undefined,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

type CommentSchema = InferSchemaType<typeof commentSchema>;

export interface IComment extends CommentSchema {
  _id: Types.ObjectId;
}

commentSchema.pre('save', function markCreationState() {
  this.$locals.wasNew = this.isNew;
});

commentSchema.post('save', async function incrementCount() {
  if (!this.$locals.wasNew) {
    return;
  }

  await Photo.updateOne({ _id: this.photo }, { $inc: { commentsCount: 1 } });
});

commentSchema.post('deleteOne', { document: true, query: false }, async function decrementCount() {
  await Photo.updateOne({ _id: this.photo }, { $inc: { commentsCount: -1 } });
});

commentSchema.post('findOneAndDelete', async function decrementCountAfterQueryDelete(doc: IComment | null) {
  if (!doc) {
    return;
  }

  await Photo.updateOne({ _id: doc.photo }, { $inc: { commentsCount: -1 } });
});

commentSchema.index({ photo: 1, author: 1 });
commentSchema.index({ photo: 1, createdAt: -1 });

const Comment = model<IComment>('Comment', commentSchema);

export default Comment;
