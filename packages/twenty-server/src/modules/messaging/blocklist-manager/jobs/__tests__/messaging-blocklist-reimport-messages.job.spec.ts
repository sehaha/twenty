import { In, Not } from 'typeorm';

import { MessageChannelSyncStage } from 'twenty-shared/types';

import { BlocklistReimportMessagesJob } from 'src/modules/messaging/blocklist-manager/jobs/messaging-blocklist-reimport-messages.job';

describe('BlocklistReimportMessagesJob', () => {
  let workspaceOrmManager: any;
  let messageChannelRepository: any;
  let connectedAccountRepository: any;
  let userWorkspaceRepository: any;
  let messagingChannelSyncStatusService: any;
  let job: BlocklistReimportMessagesJob;

  beforeEach(() => {
    workspaceOrmManager = {
      executeInWorkspaceContext: jest.fn((callback) => callback()),
      getRepository: jest.fn(),
    };
    messageChannelRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'channel-1' }]),
    };
    connectedAccountRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    userWorkspaceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    messagingChannelSyncStatusService = {
      resetAndMarkAsMessagesListFetchPending: jest.fn().mockResolvedValue(undefined),
    };

    job = new BlocklistReimportMessagesJob(
      workspaceOrmManager,
      messageChannelRepository,
      connectedAccountRepository,
      userWorkspaceRepository,
      messagingChannelSyncStatusService,
    );
  });

  it('resets idle channels when a workspace-scoped blocklist handle is removed', async () => {
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

    expect(messageChannelRepository.find).toHaveBeenCalledWith({
      select: ['id'],
      where: {
        syncStage: Not(
          In([
            MessageChannelSyncStage.PENDING_CONFIGURATION,
            MessageChannelSyncStage.MESSAGE_LIST_FETCH_ONGOING,
            MessageChannelSyncStage.MESSAGES_IMPORT_ONGOING,
          ]),
        ),
        workspaceId: 'workspace-1',
      },
    });

    expect(
      messagingChannelSyncStatusService.resetAndMarkAsMessagesListFetchPending,
    ).toHaveBeenCalledWith(['channel-1'], 'workspace-1');
  });
});
