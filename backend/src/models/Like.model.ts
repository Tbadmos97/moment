import { Schema, Types, model, type InferSchemaType } from 'mongoose';

import Photo from './Photo.model';

const likeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photo: {
      type: Schema.Types.ObjectId,
      ref: 'Photo',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

type LikeSchema = InferSchemaType<typeof likeSchema>;

export interface ILike extends LikeSchema {
  _id: Types.ObjectId;
}

likeSchema.pre('save', function markCreationState() {
  this.$locals.wasNew = this.isNew;
});

likeSchema.post('save', async function increaseLikeCount() {
  if (!this.$locals.wasNew) {
    return;
  }

  await Photo.updateOne(
    { _id: this.photo },
    {
      $inc: { likesCount: 1 },
      $addToSet: { likes: this.user },
    },
  );
});

likeSchema.post('deleteOne', { document: true, query: false }, async function decreaseLikeCount() {
  await Photo.updateOne(
    { _id: this.photo },
    {
      $inc: { likesCount: -1 },
      $pull: { likes: this.user },
    },
  );
});

likeSchema.post('findOneAndDelete', async function decreaseLikeCountAfterQueryDelete(doc: ILike | null) {
  if (!doc) {
    return;
  }

  await Photo.updateOne(
    { _id: doc.photo },
    {
      $inc: { likesCount: -1 },
      $pull: { likes: doc.user },
    },
  );
});

likeSchema.index({ user: 1, photo: 1 }, { unique: true });

const Like = model<ILike>('Like', likeSchema);

export default Like;
