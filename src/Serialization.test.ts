import { expect, test } from '@jest/globals';
import { exportMPM, handleNode, MPM } from '.';

test('serializes MPM', () => {
    const mpm = new MPM()

    mpm.setPerformanceName('test performance')

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
    }, 0)

    const serialized = handleNode(mpm.doc)
    console.log(serialized)

    expect(exportMPM(mpm)).toEqual(`
<mpm>
  <metadata>
    <authors>
      <author number="1" #text="John Doe"></author>
      <author number="2" #text="Jane Doe"></author>
    </authors>
    <comments></comments>
    <relatedResources></relatedResources>
  </metadata>
  <performance name="test performance" pulsesPerQuarter="720">
    <part>
      <global>
        <header></header>
        <dated>
          <articulationMap>
            <articulation relativeDuration="0.5" date="720" xml:id="any_id"></articulation>
          </articulationMap>
        </dated>
      </global>
      <part midi.port="0" midi.channel="0" number="1">
        <header></header>
        <dated>
          <articulationMap>
            <articulation relativeDuration="0.2" date="1440" xml:id="any_id"></articulation>
          </articulationMap>
        </dated>
      </part>
    </part>
  </performance>
</mpm>`)
});
