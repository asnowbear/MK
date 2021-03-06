/**
 * Created by zhangyong on 2017/7/7.
 */


var featureLayer = new mk.FeatureLayer()

// 初始化map、view和layer
var mapextent = [0, 0, 1024, 968];
var map = new mk.Map({
  layers: [
    new mk.SingleImageLayer({
      url: 'source/online_communities.png',
      imageExtent: mapextent,
      projection: {
        extent: mapextent
      }
    }),
    featureLayer
  ],
  target: 'map',
  view: new mk.View({
    projection: {
      extent: mapextent
    },
    center: mk.ExtentUtil.getCenter(mapextent),
    zoom: 2,
    maxZoom: 8
  })
});

// 绘图工具
var drawTool = new mk.Draw({
  type: 'polygon',
  drawLayer: featureLayer
})

map.addComponents(drawTool)
drawTool.active = false

var select = new mk.Select({
  selectMode: mk.BrowserEvent.MOUSE_MOVE
})

map.addComponents(select)

// 多边形
var rings = [[800,580],[490,600],[255, 820], [1000,1000],[800,580]]
var polygon = new mk.Polygon(rings)
var feature = new mk.Feature(polygon)

featureLayer.addFeature(feature)


function getIntersectFeatures (feature, targetLayer) {
  var allFeatures = targetLayer.features
  
  var results = allFeatures.filter(function(f){
    return f.id !== feature.id &&
      f.geometryType !== mk.Geometry.POINT &&
      mk.intersects(f.geometry, feature.geometry)
  })
  
  return results
}


drawTool.addEventListener(mk.DrawEvent.EventType.DRAW_END, function(drawEvent){
  var drawFeature = drawEvent.feature
  var intersectedFeatures = getIntersectFeatures(drawFeature, featureLayer)
  if (intersectedFeatures.length === 0) {
    return
  }
  
  select.active = true
  drawTool.active = false
  
  var jCutGeometry = convertToJstsGeometry(drawFeature.geometry)
  
  var jGeometrys = []
  intersectedFeatures.forEach(function(f){
    jGeometrys.push(convertToJstsGeometry(f.geometry))
  })
  
  var cutGeometry = null
  for (var i = 0, len = jGeometrys.length; i < len ; i++) {
    try{
      cutGeometry = jCutGeometry.difference(jGeometrys[i])
    }catch(e){
      console.log('something is wrong')
    }
    
    if (cutGeometry) {
      jCutGeometry = cutGeometry
    }
  }
  
  var differenceResult = cutGeometry
  
  try{
    var geometries = []
    if (differenceResult.geometries) {
      geometries = differenceResult.geometries
    } else {
      geometries.push({shell : differenceResult.shell})
    }
    
    for (var i = 0; i < geometries.length ; i ++) {
      var geometryItem = geometries[i]
      
      var coords = geometryItem.shell.points.coordinates
      
      var newCoords = []
      coords.forEach(function(g){
        newCoords.push([g.x, g.y])
      })
      
      var clipedPolygon = new mk.Polygon()
      clipedPolygon.setCoordinates(newCoords)
      
      var clipedFeature = new mk.Feature(clipedPolygon)
      
      featureLayer.addFeature(clipedFeature)
      featureLayer.removeFeature(drawFeature)
    }
  }catch(e){
    
  }
  
})


var geometryFactory = null;
function convertToJstsGeometry(geometry) {
  if (geometryFactory === null) {
    geometryFactory = new jsts.geom.GeometryFactory();
  }
  
  if (geometry.geometryType === mk.Geometry.POLYGON) {
    return convertToPolygon(geometry)
  } else if (geometry.geometryType === mk.Geometry.LINE ) {
    return convertToLine(geometry)
  }
}

function convertToLine (line) {
  const linearRings = line.getCoordinates()
  
  var coordinates = []
  linearRings.forEach(function(point){
    coordinates.push(new jsts.geom.Coordinate(point[0], point[1]))
  })
  
  return geometryFactory.createLineString(coordinates)
}

function convertToPolygon (polygon) {
  const linearRings = polygon.getCoordinates()
  
  var coordinates = []
  linearRings.forEach(function(point){
    coordinates.push(new jsts.geom.Coordinate(point[0], point[1]))
  })
  
  return geometryFactory.createPolygon(coordinates)
}


function onDrawClick () {
  drawTool.active = true
  select.active = false
  drawTool.drawMode = mk.Draw.DrawMode.POLYGON
}








