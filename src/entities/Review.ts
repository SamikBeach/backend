import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Comment } from './Comment';
import { User } from './User';
import { Book } from './Book';
import { UserCommentLike } from './UserCommentLike';
import { UserReviewLike } from './UserReviewLike';

@Index('review_user_id_fk', ['userId'], {})
@Index('review_book_id_fk', ['bookId'], {})
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

  @Column('int', { name: 'like_count', default: () => "'0'" })
  likeCount: number;

  @Column('int', { name: 'comment_count', default: () => "'0'" })
  commentCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

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

  @OneToMany(
    () => UserCommentLike,
    (userCommentLike) => userCommentLike.comment,
  )
  userCommentLikes: UserCommentLike[];

  @OneToMany(() => UserReviewLike, (userReviewLike) => userReviewLike.review)
  userReviewLikes: UserReviewLike[];
}
