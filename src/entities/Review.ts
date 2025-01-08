import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comment } from './Comment';
import { User } from './User';
import { Book } from './Book';
import { UserComment } from './UserComment';
import { UserReview } from './UserReview';

@Index('review_book_id_fk', ['bookId'], {})
@Index('review_user_id_fk', ['userId'], {})
@Entity('review', { schema: 'samik_beach_v3' })
export class Review {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('text', { name: 'title' })
  title: string;

  @Column('text', { name: 'content' })
  content: string;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'book_id' })
  bookId: number;

  @Column('datetime', { name: 'created_at' })
  createdAt: Date;

  @Column('datetime', { name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @OneToMany(() => Comment, (comment) => comment.review)
  comments: Comment[];

  @ManyToOne(() => User, (user) => user.reviews, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;

  @ManyToOne(() => Book, (book) => book.reviews, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'book_id', referencedColumnName: 'id' }])
  book: Book;

  @OneToMany(() => UserComment, (userComment) => userComment.review)
  userComments: UserComment[];

  @OneToMany(() => UserReview, (userReview) => userReview.review)
  userReviews: UserReview[];
}
