function hxlProxyToJSON(input){
    var output = [];
    var keys = [];
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}


var surveyData ;
var reconstructionDivs = [];
var foodSecDivs = [];
var protectionDivs = [];

var blue = '#007CE0';
var blueLight = '#72B0E0';
var green = '#06C0B4';

//sidebar chart variables
var sideChartWidth = 400;
var chartBarHeight = 28;
var chartBarGap = 2;
var chartMargins = {top:0, left:15, right:50, bottom: 30};


function print_filter(filter) {
    var f = eval(filter);
    if (typeof (f.length) != "undefined") {} else {}
    if (typeof (f.top) != "undefined") {
        f = f.top(Infinity);
    } else {}
    if (typeof (f.dimension) != "undefined") {
        f = f.dimension(function (d) {
            return "";
        }).top(Infinity);
    } else {}
    console.log(filter + "(" + f.length + ") = " + JSON.stringify(f).replace("[", "[\n\t").replace(/}\,/g, "},\n\t").replace("]", "\n]"));
}

//compute height of charts based on number of values
function computeChartHeight(group) {
    var count = group.all().length;
    var margins = chartMargins.bottom + chartMargins.top;
    return (count*(chartBarGap+chartBarHeight)) + (margins+chartBarGap);
}

// Generate right sidebar charts and map
function generateCharts(geom) {

    var ethnicityChart = dc.rowChart('#ethnicity');
    var occupationChart = dc.rowChart('#occupation');
    var householdStatusChart = dc.rowChart('#householdStatus');
    var genderChart = dc.pieChart('#gender');
    var ageChart = dc.barChart('#age');

    var whereChart = dc.leafletChoroplethChart('#map');

    var ethnicityDim = surveyData.dimension(function (d) {
        return d["Caste/ethnicity"];
    });
    var occupationDim = surveyData.dimension(function (d) {
        return d["Occupation"];
    });
    var householdStatusDim = surveyData.dimension(function (d) {
        return d["What is the current status of your home?"];
    });
    var genderDim = surveyData.dimension(function (d) {
        return d["Gender"];
    });
    var ageDim = surveyData.dimension(function (d) {
        return d["Age"];
    });

    var mapDim = surveyData.dimension(function (d) {
        return d["HRRP_DCODE"];
    });
    var mapGroup = mapDim.group();
    //print_filter(mapGroup);

    var ethnicityGroup = ethnicityDim.group();
    var occupationGroup = occupationDim.group();
    var householdStatusGroup = householdStatusDim.group();
    var genderGroup = genderDim.group();
    var ageGroup = ageDim.group();


    var all = surveyData.groupAll();

    //tooltip
    var rowtip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d.key+': '+d3.format('0,000')(d.value); }); 


    ethnicityChart.width(sideChartWidth)
        .height(function () {
            return computeChartHeight(ethnicityGroup);
        })
        .margins(chartMargins)
        .fixedBarHeight(chartBarHeight)
        .gap(chartBarGap)
        .dimension(ethnicityDim)
        .group(ethnicityGroup)
        .data(function (group) {
            return group.top(Infinity);
        })
        .colors(blue)
        .elasticX(true)
        .renderTitle(false)
        .xAxis().ticks(3);


    occupationChart.width(sideChartWidth)
        .height(function () {
            return computeChartHeight(occupationGroup);
        })
        .margins(chartMargins)
        .fixedBarHeight(chartBarHeight)
        .gap(chartBarGap)
        .dimension(occupationDim)
        .group(occupationGroup)
        .data(function (group) {
            return group.top(Infinity);
        })
        .colors(blue)
        .elasticX(true)
        .renderTitle(false)
        .xAxis().ticks(3);

    householdStatusChart.width(sideChartWidth)
        .height(function () {
            return computeChartHeight(householdStatusGroup);
        })
        .margins(chartMargins)
        .fixedBarHeight(chartBarHeight)
        .gap(chartBarGap)
        .dimension(householdStatusDim)
        .group(householdStatusGroup)
        .data(function (group) {
            return group.top(Infinity);
        })
        .colors(blue)
        .elasticX(true)
        .renderTitle(false)
        .xAxis().ticks(3);

    var genderColors = d3.scale.ordinal().range([blue, blueLight]);
    genderChart.width(350)
        .height(250)
        .radius(100)
        .dimension(genderDim)
        .group(genderGroup)
        .colors(genderColors);

    ageChart.width(350)
        .height(250)
        .margins({ top: 0, right: 10, bottom: 80, left: 10 })
        .dimension(ageDim)
        .group(ageGroup)
        .colors(blue)
        .elasticX(true)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .renderTitle(false)
        .xAxis().ticks(5);

    whereChart.width($('#map').width())
        .height(350)
        .dimension(mapDim)
        .group(mapGroup)
        .zoom(0)
        .center([27.7, 85.2]) //katmandu 27.7096/85.2918
        .geojson(geom)
        .colors(['#DDDDDD', '#A7C1D3', '#71A5CA', '#3B88C0', '#056CB6'])
        .colorDomain([0, 4])
        .colorAccessor(function (d) {
            var c = 0
            if (d > 250) {
                c = 4;
            } else if (d > 150) {
                c = 3;
            } else if (d > 50) {
                c = 2;
            } else if (d > 0) {
                c = 1;
            };
            return c;

        })
        .featureKeyAccessor(function (feature) {
            return feature.properties['HLCIT_CODE'];
        }).popup(function (feature) {
            return feature.properties['DISTRICT'];
        })
        .renderPopup(true);

    $('.loader').remove();
    dc.renderAll();

    //tooltip events
    d3.selectAll('g.row').call(rowtip);
    d3.selectAll('g.row').on('mouseover', rowtip.show).on('mouseout', rowtip.hide);   


    var map = whereChart.map();
    map.options.minZoom = 8;

    zoomToGeom(geom);

    function zoomToGeom(geom) {
        var bounds = d3.geo.bounds(geom);
        var bnds = [
                    [26.91925778222094, 84.41872367235965],
                    [28.752320805960494, 86.6860110153961] 
                    ];
        // map.fitBounds([
        //     [bounds[0][1], bounds[0][0]],
        //     [bounds[1][1], bounds[1][0]]
        // ]);
        map.fitBounds(bnds);
    }

// removing used option 
    if (protectionDivs.length == 0) {
        $('.surveySelectionMenu').children().filter(function(index, option) {
            return option.value==="protection";
        }).remove();
    } else if (foodSecDivs.length == 0) {
        $('.surveySelectionMenu').children().filter(function(index, option) {
            return option.value==="foodSecurity";
        }).remove();
    }

    function drawSurveyChart(tpe,question,i){
        var chart = dc.rowChart('#'+tpe+i);
        var dim = surveyData.dimension(function(d){ 
            return d[question]; 
        });
        var grp = dim.group();

        chart.width(350)
            .height(function () {
                return computeChartHeight(grp);
            })
            .margins(chartMargins)
            .fixedBarHeight(chartBarHeight)
            .gap(chartBarGap)
            .dimension(dim)
            .group(grp)
            .data(function (group) {
                return group.top(Infinity);
            })
            .colors(green)
            .colorAccessor(function (d, i) {
                return 0;
            })
            .renderTitle(false)
            .elasticX(true)
            .xAxis().ticks(3);
            
            chart.render();


        //tooltip events
        d3.selectAll('g.row').call(rowtip);
        d3.selectAll('g.row').on('mouseover', rowtip.show).on('mouseout', rowtip.hide);   
    }// end drawSurveyChart

    function generateSurveyCharts(selection){
        switch (selection) {
            case "foodSecurity":
                $('.surveycharts').html('<p>');

                for (var i = foodSecDivs.length - 1; i >= 0; i--) {
                    $('.surveycharts').append('<div class="col-sm-6"><h5 style="width:350px;">'+foodSecDivs[i]+'</h5><div id="foodSecurity'+i+'"></div></div>');
                    drawSurveyChart('foodSecurity', foodSecDivs[i], i);
                }
                break;
            case "protection":
                $('.surveycharts').html('<p>');

                for (var i = protectionDivs.length - 1; i >= 0; i--) {
                    $('.surveycharts').append('<div class="col-sm-6"><h5 style="width:350px;">'+protectionDivs[i]+'</h5><div id="foodSecurity'+i+'"></div></div>');
                    drawSurveyChart('foodSecurity', protectionDivs[i], i);
                }
                break;
            default:
                $('.surveycharts').html('<p>');

                for (var i = reconstructionDivs.length - 1; i >= 0; i--) {
                    $('.surveycharts').append('<div class="col-sm-6"><h5 style="width:350px;">'+reconstructionDivs[i]+'</h5><div id="reconstruction'+i+'"></div></div>');
                    drawSurveyChart('reconstruction', reconstructionDivs[i], i);
                }
                break;
        }

    } //end generateSurveyCharts

    $('document').ready(function(){
        var selectedSurvey = $('.surveySelectionMenu').val();
        generateSurveyCharts();

    });

    $('.surveySelectionMenu').on('change', function(e){
        var selectedSurvey = $('.surveySelectionMenu').val();
        generateSurveyCharts(selectedSurvey);
    });

} // end generateCharts()


//data call 
var dataCall = $.ajax({
    type: 'GET',
    url: 'data/survey.json',
    dataType: 'json',
});

var geodataCall = $.ajax({
    type: 'GET',
    url: 'data/map.json',
    dataType: 'json',
});

var sectionQuestionsCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1trL6M1_ousu_G0p9qoMw65TrbrX-Zi2gAvOzankIOH0%2Fedit%23gid%3D0&force=on',
    dataType: 'json',
});

$.when(dataCall, geodataCall,sectionQuestionsCall).then(function (dataArgs, geomArgs, sectorQuestionsArgs) {
    var data = dataArgs[0];
    var geom = geomArgs[0];
    var sectorQuestions = hxlProxyToJSON(sectorQuestionsArgs[0]);
    sectorQuestions.forEach( function(element) {
        if (element['#meta+protection'] !="") {
            protectionDivs.push(element['#meta+protection']);
        }
        if (element['#meta+reconstruction'] !="") {
            reconstructionDivs.push(element['#meta+reconstruction']);
        }
        if (element['#meta+foodsecurity'] !="") {
            foodSecDivs.push(element['#meta+foodsecurity']);
        }

    });
    surveyData = crossfilter(data);
    generateCharts(geom);
});
