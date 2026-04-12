import bcrypt from 'bcryptjs';
import {
  Model,
  Schema,
  Types,
  model,
  type HydratedDocument,
  type InferSchemaType,
} from 'mongoose';

import type { UserRole } from '../types/auth.types';

const USER_ROLES: UserRole[] = ['creator', 'consumer', 'admin'];

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'consumer',
    },
    avatar: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 160,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokens: {
      type: [String],
      default: [],
      validate: {
        validator: (tokens: string[]) => tokens.length <= 5,
        message: 'A maximum of 5 refresh tokens can be stored.',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

type UserSchema = InferSchemaType<typeof userSchema>;

export interface IUser extends UserSchema {
  _id: Types.ObjectId;
}

export interface UserMethods {
  comparePassword: (plain: string) => Promise<boolean>;
}

export interface UserVirtuals {
  photoCount?: number;
}

export interface UserModel extends Model<IUser, object, UserMethods, UserVirtuals> {
  findByEmail: (email: string) => Promise<HydratedDocument<IUser, UserMethods, UserVirtuals> | null>;
}

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.method('comparePassword', async function comparePassword(this: IUser, plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password);
});

userSchema.static('findByEmail', function findByEmail(email: string) {
  return this.findOne({ email: email.toLowerCase().trim() });
});

userSchema.virtual('photoCount', {
  ref: 'Photo',
  localField: '_id',
  foreignField: 'creator',
  count: true,
});

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

const User = model<IUser, UserModel>('User', userSchema);

export default User;
