import DomainGraph from '@/modules/graph/components/DomainGraph';

// Full-bleed: cancel the dashboard main's px-8/py-10 padding and fill the viewport.
const Graph = () => {
    return (
        <div className='-mx-8 -my-10 h-dvh overflow-hidden'>
            <DomainGraph />
        </div>
    );
};

export default Graph;
