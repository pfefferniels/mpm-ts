import { expect, test } from '@jest/globals';
import { exportMPM, handleNode, MPM } from '.';

test('serializes MPM', () => {
    const mpm = new MPM()

    mpm.setMetadata({
        type: 'metadata',
        authors: [
            {
                type: 'author',
                number: 1,
                text: 'John Doe'
            },
            {
                type: 'author',
                number: 2,
                text: 'Jane Doe'
            }],
        comments: [],
        relatedResources: []
    })

    mpm.insertInstruction({
        type: 'articulation',
        relativeDuration: 0.5,
        date: 720,
        'xml:id': 'any_id'
    }, 'global')

    mpm.insertInstruction({
        type: 'articulation',
        relativeDuration: 0.2,
        date: 1440,
        'xml:id': 'any_id'
    }, 'global')

    const serialized = handleNode(mpm.doc)
    console.log(serialized)

    expect(exportMPM(mpm)).toEqual("<mpm><metadata><author number=\"1\" #text=\"John Doe\"></author><author number=\"2\" #text=\"Jane Doe\"></author></metadata><performance name=\"\" pulsesPerQuarter=\"720\"><part><part><dated><articulation relativeDuration=\"0.5\" date=\"720\" xml:id=\"any_id\"></articulation><articulation relativeDuration=\"0.2\" date=\"1440\" xml:id=\"any_id\"></articulation></dated><header></header></part></part></performance></mpm>")
});
