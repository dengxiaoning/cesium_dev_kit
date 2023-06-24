import * as Cesium from 'Cesium';
export * from './Sensor/Sensor';
export * from './Material/Material';

import {getLinkedPointList} from './Core/getLinkedPointList';
Cesium.getLinkedPointList = getLinkedPointList;