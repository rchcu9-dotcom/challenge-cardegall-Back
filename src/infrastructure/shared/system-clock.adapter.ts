import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../domain/shared/ports/clock.port';

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
