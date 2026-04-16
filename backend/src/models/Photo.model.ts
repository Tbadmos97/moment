import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const photoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    location: {
      name: {
        type: String,
        trim: true,
        default: undefined,
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (value?: number[]) => !value || value.length === 2,
          message: 'Coordinates must include [longitude, latitude].',
        },
        default: undefined,
      },
    },
    people: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 40,
        },
      ],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 10,
        message: 'People supports up to 10 names.',
      },
    },
    tags: {
      type: [
        {
          type: String,
          lowercase: true,
          trim: true,
          maxlength: 30,
        },
      ],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 10,
        message: 'Tags supports up to 10 values.',
      },
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imageKey: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailKey: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

type PhotoSchema = InferSchemaType<typeof photoSchema>;

export interface IPhoto extends PhotoSchema {
  _id: Types.ObjectId;
}

photoSchema.index({ creator: 1 });
photoSchema.index({ creator: 1, createdAt: -1 });
photoSchema.index({ isPublished: 1, createdAt: -1 });
photoSchema.index({ tags: 1 });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ title: 'text', caption: 'text', tags: 'text' });

photoSchema.pre('deleteOne', { document: true, query: false }, async function cascadeRelatedRecords() {
  const commentModel = this.$model('Comment');
  const likeModel = this.$model('Like');

  await Promise.all([
    commentModel.deleteMany({ photo: this._id }),
    likeModel.deleteMany({ photo: this._id }),
  ]);
});

photoSchema.pre('findOneAndDelete', async function cascadeRelatedRecordsForQuery() {
  const commentModel = this.model.db.model('Comment');
  const likeModel = this.model.db.model('Like');
  const doc = await this.model.findOne(this.getFilter()).select('_id').lean<{ _id: Types.ObjectId }>();

  if (!doc) {
    return;
  }

  await Promise.all([
    commentModel.deleteMany({ photo: doc._id }),
    likeModel.deleteMany({ photo: doc._id }),
  ]);
});

const Photo = model<IPhoto>('Photo', photoSchema);

export default Photo;
