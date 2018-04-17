'use strict';

angular.module('app.print-matrix', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/print-matrix', {
    templateUrl: 'views/print-matrix.html'
  , controller: 'PrintMatrixController'
  })
}])

.controller('PrintMatrixController', function(
	$scope,
	$location,
	$timeout,
	networkData,
	scalesUtils
) {
	$scope.networkData = networkData

  $scope.selectedAttId = $location.search().att
  $scope.matrixDetailLevel = +$location.search().detail
  $scope.viewBox = {
    x: +$location.search().x,
    y: +$location.search().y,
    w: +$location.search().w,
    h: +$location.search().h,
  }
  
	$scope.$watch('networkData.loaded', function(){
		if ($scope.networkData && $scope.networkData.g) {
	    update()
	  }
	})

	function update() {
    $scope.attribute = $scope.networkData.nodeAttributesIndex[$scope.selectedAttId]

    // Rebuild node filter
    // All unchecked / default: show all
    $scope.nodeFilter = function(){ return true }
    $scope.modalityFilter = function(){ return true }
    if ($scope.attribute && $scope.attribute.type == 'partition') {
      $scope.modalitiesSelection = {}
      var modSelection = $location.search().filter.split(',').map(function(d){ return d=='true' })
      $scope.attribute.modalities.forEach(function(mod, i){
        $scope.modalitiesSelection[mod.value] = modSelection[i]
      })
      if ($scope.attribute.modalities.some(function(mod){ return $scope.modalitiesSelection[mod.value]})) {
        $scope.nodeFilter = function(nid){
          return $scope.modalitiesSelection[$scope.networkData.g.getNodeAttribute(nid, $scope.attribute.id)]
        }
        $scope.modalityFilter = function(modValue) {
          return $scope.modalitiesSelection[modValue]
        }
      }
    } else if($scope.attribute && ($scope.attribute.type == 'ranking-size' || $scope.attribute.type == 'ranking-color')) {
      // Rebuild modalities
      $scope.modalities = scalesUtils.buildModalities($scope.attribute)

      // Rebuild node filter
      $scope.modalitiesSelection = {}
      var modSelection = $location.search().filter.split(',').map(function(d){ return d=='true' })
      $scope.modalities.forEach(function(mod, i){
        $scope.modalitiesSelection[mod.value] = modSelection[i]
      })
      if ($scope.modalities.some(function(mod){ return $scope.modalitiesSelection[mod.value]})) {
        $scope.nodeFilter = function(nid){
          var nodeValue = $scope.networkData.g.getNodeAttribute(nid, $scope.attribute.id)
          var matchingModalities
          if ($scope.attribute.integer) {
            matchingModalities = $scope.modalities.filter(function(mod){
              return (nodeValue >= mod.min && nodeValue <= mod.max)
            })
          } else {
            matchingModalities = $scope.modalities.filter(function(mod){
              return (nodeValue >= mod.min && nodeValue < mod.max)
                || (mod.pmax == 1 && nodeValue >= mod.min && nodeValue <= mod.max * 1.00000000001)
            })
          }
          if (matchingModalities.length == 0) {
            console.error('[Error] node ', nid, 'cannot be found in the scale of ', $scope.attribute.name, nodeValue)
            return
          }
          if (matchingModalities.length > 1) {
            console.warn('Node ', nid, 'matches several modality ranges of ', $scope.attribute.name, matchingModalities)
          }
          return $scope.modalitiesSelection[matchingModalities[0].value]
        }
      }
    }

    var g = $scope.networkData.g
    $scope.nodes = g.nodes()
      .filter($scope.nodeFilter)
    scalesUtils.sortNodes($scope.nodes, $scope.attributeId)
    $scope.nodes = $scope.nodes.map(function(nid){
        return g.getNodeAttributes(nid)
      })
  }
})
