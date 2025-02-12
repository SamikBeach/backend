import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './User';
import { Review } from './Review';

export type ReportReason =
  | 'INAPPROPRIATE'
  | 'SPAM'
  | 'COPYRIGHT'
  | 'HATE_SPEECH'
  | 'OTHER';

@Entity('review_report', { schema: 'classicswalk' })
export class ReviewReport {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'reporter_id' })
  reporterId: number;

  @Column('int', { name: 'review_id' })
  reviewId: number;

  @Column('enum', {
    name: 'reason',
    enum: ['INAPPROPRIATE', 'SPAM', 'COPYRIGHT', 'HATE_SPEECH', 'OTHER'],
  })
  reason: ReportReason;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'reporter_id', referencedColumnName: 'id' }])
  reporter: User;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'review_id', referencedColumnName: 'id' }])
  review: Review;
}
