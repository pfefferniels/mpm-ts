import { expect, test } from '@jest/globals';
import { exportMPM, MPM } from '.';
import { importMPM } from './Deserialization';

const serialized = `
<mpm>
  <metadata>
    <author number="1">John Doe</author>
    <comment>based on musical intuition</comment>
    <relatedResources uri="test.mei"></relatedResources>
  </metadata>
  <performance name="test performance" pulsesPerQuarter="720">
    <global>
      <header>
        <articulationStyles>
          <styleDef name="performance_style">
            <articulationDef name="def_abc" relativeVelocity="-10"></articulationDef>
          </styleDef>
        </articulationStyles>
      </header>
      <dated>
        <articulationMap>
          <style xml:id="style_1" date="0" name.ref="performance_style"></style>
          <articulation relativeDuration="0.5" date="720" xml:id="any_id"></articulation>
        </articulationMap>
      </dated>
    </global>
    <part midi.port="0" midi.channel="0" number="1" name="part_0">
      <header></header>
      <dated>
        <articulationMap>
          <articulation relativeDuration="0.2" date="1440" xml:id="any_id"></articulation>
        </articulationMap>
      </dated>
    </part>
  </performance>
</mpm>`

test('serializes MPM', () => {
  const mpm = new MPM()

  mpm.setPerformanceName('test performance')

  mpm.setMetadata([
    {
      type: 'author',
      number: 1,
      text: 'John Doe'
    },
    {
      type: 'comment',
      text: 'based on musical intuition'
    },
    {
      type: 'relatedResources',
      uri: 'test.mei'
    }
  ])

  mpm.insertStyle({
    type: 'style',
    'xml:id': 'style_1',
    date: 0,
    'name.ref': 'performance_style'
  }, 'articulation', 'global')

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

  mpm.insertDefinition({
    type: 'articulationDef',
    name: 'def_abc',
    relativeVelocity: -10
  }, 'global')

  expect(exportMPM(mpm)).toEqual(serialized)
});

test('deserializes MPM', () => {
  const mpm = importMPM(serialized)

  expect(mpm.getInstructions().length).toBe(2)
  expect(mpm.getDefinitions('articulationDef').length).toBe(1)
  expect(mpm.getStyles('articulation', 'global').length).toBe(1)
})
