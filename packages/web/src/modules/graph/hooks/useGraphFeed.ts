import { useChannel } from '@/shared/hooks/socket/useChannel';
import { graphModel } from '@/modules/graph/model/graphModel';

// Mounted by the dashboard shell so it runs on every protected route: funnels the
// live page stream into the persistent graph model, keeping the graph complete even
// while /graph is not open.
export const useGraphFeed = (): void => {
    useChannel('/ws', {
        page: (frame) => graphModel.addPage(frame.domain, frame.links)
    });
};
