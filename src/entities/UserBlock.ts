import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
} from 'typeorm';
import { User } from './User';

@Entity('user_block', { schema: 'classicswalk' })
export class UserBlock {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'blocker_id' })
  blockerId: number;

  @Column('int', { name: 'blocked_id' })
  blockedId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'blocker_id', referencedColumnName: 'id' }])
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'blocked_id', referencedColumnName: 'id' }])
  blocked: User;
}
