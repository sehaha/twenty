import { In, Not } from 'typeorm';

import { CalendarChannelSyncStage } from 'twenty-shared/types';

import { BlocklistReimportCalendarEventsJob } from 'src/modules/calendar/blocklist-manager/jobs/blocklist-reimport-calendar-events.job';

describe('BlocklistReimportCalendarEventsJob', () => {
  let workspaceOrmManager: any;
  let calendarChannelRepository: any;
  let userWorkspaceRepository: any;
  let calendarChannelSyncStatusService: any;
  let job: BlocklistReimportCalendarEventsJob;

  beforeEach(() => {
    workspaceOrmManager = {
      executeInWorkspaceContext: jest.fn((callback) => callback()),
      getRepository: jest.fn(),
    };
    calendarChannelRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'cal-channel-1' }]),
    };
    userWorkspaceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    calendarChannelSyncStatusService = {
      resetAndMarkAsCalendarEventListFetchPending: jest.fn().mockResolvedValue(undefined),
    };

    job = new BlocklistReimportCalendarEventsJob(
      workspaceOrmManager,
      calendarChannelRepository,
      userWorkspaceRepository,
      calendarChannelSyncStatusService,
    );
  });

  it('resets idle calendar channels when a workspace-scoped blocklist handle is removed', async () => {
    await job.handle({
      workspaceId: 'workspace-1',
      events: [
        {
          recordId: 'blocklist-1',
          properties: {
            before: {
              id: 'blocklist-1',
              handle: 'example.com',
              workspaceMemberId: null,
            } as any,
          },
        } as any,
      ],
    });

    expect(calendarChannelRepository.find).toHaveBeenCalledWith({
      select: ['id'],
      where: {
        syncStage: Not(
          In([
            CalendarChannelSyncStage.PENDING_CONFIGURATION,
            CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_ONGOING,
            CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_ONGOING,
          ]),
        ),
        workspaceId: 'workspace-1',
      },
    });

    expect(
      calendarChannelSyncStatusService.resetAndMarkAsCalendarEventListFetchPending,
    ).toHaveBeenCalledWith(['cal-channel-1'], 'workspace-1');
  });
});
