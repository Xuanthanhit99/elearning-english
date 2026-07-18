import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RateListeningSessionDto } from './rate-listening-session.dto';

/*
 * UNVERIFIED (Stage 6D.1): không chạy được `npm test` trong sandbox này
 * (môi trường hết dung lượng đĩa, xem report). Test dùng trực tiếp
 * class-validator, không phụ thuộc NestJS TestingModule/DB, nên rủi ro
 * runtime thấp nhất trong số các test đã thêm — nhưng vẫn cần chạy thật
 * để xác nhận trước khi coi là PASS.
 */
describe('RateListeningSessionDto', () => {
  async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(RateListeningSessionDto, payload);
    return validate(dto);
  }

  it('hợp lệ với rating 1-5 và không có comment', async () => {
    const errors = await validateDto({ rating: 5 });
    expect(errors).toHaveLength(0);
  });

  it('hợp lệ với rating + comment ngắn', async () => {
    const errors = await validateDto({ rating: 3, comment: 'Bài học ổn' });
    expect(errors).toHaveLength(0);
  });

  it('reject rating = 0 (dưới Min)', async () => {
    const errors = await validateDto({ rating: 0 });
    expect(errors.some((error) => error.property === 'rating')).toBe(true);
  });

  it('reject rating = 6 (vượt Max)', async () => {
    const errors = await validateDto({ rating: 6 });
    expect(errors.some((error) => error.property === 'rating')).toBe(true);
  });

  it('reject rating không phải số nguyên', async () => {
    const errors = await validateDto({ rating: 'five' });
    expect(errors.some((error) => error.property === 'rating')).toBe(true);
  });

  it('reject comment dài hơn 500 ký tự', async () => {
    const errors = await validateDto({
      rating: 4,
      comment: 'a'.repeat(501),
    });
    expect(errors.some((error) => error.property === 'comment')).toBe(true);
  });

  it('reject khi thiếu rating', async () => {
    const errors = await validateDto({ comment: 'Thiếu rating' });
    expect(errors.some((error) => error.property === 'rating')).toBe(true);
  });
});
