var app = angular.module('rating', ['ngRoute', 'ngCookies']);

function HomeController($scope, $http, rankData, Authentication) {
	$scope.ranking = rankData;

	$scope.loginData = {};
	$scope.loginStatus = {};

	$scope.doLogin = function ($form, $event) {
		if($form.$invalid)
			return;
		
        $scope.loginStatus.hasError = false;
		$http.post('/login', $scope.loginData).success(function (data) {
			Authentication.start(data);
			$('#loginModal').modal('hide');
		}).error(function () {
            $scope.loginStatus.hasError = true;
            $scope.loginStatus.errorMsg = "Invalid User/Password";
		});
	}

	$scope.notScored = function (local) {
		var root = $scope.$root || $scope;
		return local.puntuadores.indexOf(root.user['@rid']) === -1;
	}

	$scope.showLoginForm = function () {
		$('#loginModal').modal('show');
	}

	$scope.showRegisterForm = function () {
		$('#registerModal').modal('show');
	}

	$scope.logout = function () {
		Authentication.end();
	}
}

function DetailsController ($scope, localData) {
	$scope.local = localData;
}

function RankController ($scope, localData, $routeParams, $http, $location) {
	$scope.local = localData;
	
	$scope.saveScore = function (event) {
		$http.post('/save_rank/' + $routeParams.localSlug + '/?' + $(event.target).serialize()).success(function (data) {
			$location.path("/");
		});		
	}
}

function rateClass() {
	var getClass = function (val) {
		var className = 'ranked-excelent';
		if(val <= 9)
			className = 'ranked-good';
		if(val < 6)
			className = 'ranked-regular';
 		if(val < 3)
			className = 'ranked-bad';
		if(val < 1)
			className = 'not-ranked';
		return className;
	}

	function postLinkRateClass ($scope, $element, $attrs) {
		$scope.$watch('score', function (value) {
			value = parseFloat(value) || 0;
			$element.addClass(getClass(value));
		})
	};

  	return {
  		restrict: 'AE',
  		scope: {
	      score: '='
	    },
  	  	link: postLinkRateClass
  	};
}

function Authentication ($route, $cookieStore, $rootScope, $http) {
	return {
		start: function (data) {
			$cookieStore.put('sessionId', data.sessionId);
			$rootScope.user = data.store;
			$rootScope.failedAttempt = false;
		},
		sync: function () {
			if($rootScope.failedAttempt)
				return;
			var sessId = $cookieStore.get('sessionId');
			var self = this;

			$http.get('/check', {sessionId: sessId})
				.success(function (data) {
					$rootScope.user = data.store.user;
				})
				.error(function () {
					$rootScope.user = null;
					$rootScope.failedAttempt = true;
				});
		},
		end: function () {
			$cookieStore.remove('sessionId');
			this.sync();
		}
	};
}

function Configure($routeProvider, $locationProvider) {
	$routeProvider.when('/', {
		controller: 'HomeController',
		templateUrl: 'partials/home.html',
		controllerAs: 'vm',
		resolve: {
			rankData: function ($http, $q) {
				var defer = $q.defer();
				$http.get('/ranking.json').success(function (data) {
					defer.resolve(data);
				}).error(function (data) {
					defer.reject(data);
				});
				return defer.promise;
			}
		}
	});

	$routeProvider.when('/detalles/:localSlug', {
		controller: 'DetailsController',
		templateUrl: 'partials/detalles.html',
		resolve: {
			localData: function ($http, $q, $route) {
				var defer = $q.defer();
				$http.get('/ranking/'+ $route.current.params.localSlug +'.json')
					.error(function (data) {
						defer.reject(data);
					})
					.success(function (data) {
						defer.resolve(data);
					});
				return defer.promise;
			}
		}
	});

	$routeProvider.when('/rank/:localSlug', {
		controller: 'RankController',
		templateUrl: 'partials/rank.html',
		resolve: {
			localData: function ($http, $q, $route) {
				var defer = $q.defer();
				$http.get('/ranking/'+ $route.current.params.localSlug +'.json')
					.error(function (data) {
						defer.reject(data);
					})	
					.success(function (data) {
						defer.resolve(data);
					});
				return defer.promise;
			}
		}
	});
}

function Startup ($interval, Authentication, $rootScope) {
	var loadingModal = $("#loading-modal");
	Authentication.sync();
	$interval(Authentication.sync, 1000);

	$rootScope.$on('$routeChangeStart', function () {
		loadingModal.find('.alert').addClass('hidden');
		loadingModal.find('.progress-bar')
			.removeClass('progress-bar-danger')
			.removeClass('progress-bar-success')
			.addClass('progress-bar-warning');
		loadingModal.modal('show');
	});

	$rootScope.$on('$routeChangeSuccess', function () {
		loadingModal.find('.alert').addClass('hidden');
		loadingModal.find('.progress-bar')
			.removeClass('progress-bar-danger')
			.removeClass('progress-bar-warning');
		loadingModal.modal('hide');
	});

	$rootScope.$on('$routeChangeError', function ($event, $current, $previous, $rejection) {
		loadingModal.find('.progress-bar')
			.removeClass('progress-bar-danger')
			.removeClass('progress-bar-success')
			.addClass('progress-bar-danger');
			var errMsg = '[' + $rejection.code + '] ' + $rejection.message;
		loadingModal.find('.alert').removeClass('hidden').find('p').text(errMsg);
	});
}

app .controller('HomeController', ['$scope', '$http', 'rankData', 'Authentication', HomeController])
	.controller('DetailsController', ['$scope', 'localData', DetailsController])
	.controller('RankController', ['$scope', 'localData', '$routeParams', '$http', '$location',RankController])
	.directive('rateClass', rateClass)
	.factory('Authentication', ['$route', '$cookieStore', '$rootScope', '$http', Authentication])
	.config(['$routeProvider', '$locationProvider', Configure])
	.run(['$interval', 'Authentication', '$rootScope', Startup]);