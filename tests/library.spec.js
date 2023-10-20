import { getInProgressEvents } from './../src/bg/library.js';

describe('getInProgressEvents function', function () {
  it('Excludes cancelled events', function () {
    const result = getInProgressEvents([{
        id: '123',
        status: 'cancelled'
    }], []);
    expect(result).toStrictEqual([]);
  });

  it('Excludes events with no start or end', function () {
    const result = getInProgressEvents([{
        id: '123',
        start: new Date(),
    }, {
        id: '321',
        end: new Date(),
    }], []);
    expect(result).toStrictEqual([]);
  });
});
