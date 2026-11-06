import test from 'node:test';
import assert from 'node:assert/strict';
import {panelMove} from './panel-navigation.mjs';
test('Shared ring/prefix resolver protects typing and modifier/composition boundaries',()=>{
  assert.equal(panelMove({key:'ArrowDown'}),0);assert.equal(panelMove({key:'ArrowDown'},{plain:true}),1);
  assert.equal(panelMove({key:'ArrowUp',altKey:true}),-1);
  for(const guard of [{ctrlKey:true},{shiftKey:true},{metaKey:true},{isComposing:true},{keyCode:229},{getModifierState:()=>true}])assert.equal(panelMove({key:'ArrowDown',altKey:true,...guard}),0);
  assert.equal(panelMove({key:'x',altKey:true}),0);
});
