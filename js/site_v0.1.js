var config = {
    currentDataLink: 'link',
    fslSurveyed: 'no',
    protectionSurveyed: 'no'
};

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

var geom;
var surveyData ;
var reconstructionDivs = {},
    foodSecDivs = {},
    protectionDivs = {},
    settingsData = {};

var blue = '#007CE0';
var blueLight = '#72B0E0';
var green = '#06C0B4';

//sidebar chart variables
var sideChartWidth = 400;
var chartBarHeight = 28;
var chartBarGap = 2;
var chartMargins = {top:0, left:15, right:50, bottom: 30};

var initSettings = (function(){
    $.ajax({
        type: 'GET',
        url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1trL6M1_ousu_G0p9qoMw65TrbrX-Zi2gAvOzankIOH0%2Fedit%23gid%3D679385724&force=on',
        //url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1trL6M1_ousu_G0p9qoMw65TrbrX-Zi2gAvOzankIOH0%2Fedit%23gid%3D487730406&force=on',
        format: 'json',
        async: false,
        success: function(args){
            var dataSettings = hxlProxyToJSON(args);
            dataSettings.forEach( function(element) {
                settingsData[element['#meta+code']] = {'year': element['#date+year'], 'month': element['#date+month'], 'link': element['#meta+link'], 'fslSurveyed': element['#meta+fsl'], 'protectionSurveyed':element['#meta+protection']};
            });
        }
    })
})();

initConfig();

//initialize configs and surveyData crossfilter
function initConfig (argument) {
    var big = 1 ;
    for (key in settingsData){
        var current = parseFloat(key);
        current >= big ? big = current : '';
    }
    // console.log('the winner is ', big);

    if (big == 'undefined') {
        big = 201711 ;
    }

    let fsl = settingsData[big].fslSurveyed;
    let prct =  settingsData[big].protectionSurveyed;

    config.currentDataLink = settingsData[big].link ;
    config.fslSurveyed = settingsData[big].fslSurveyed;
    config.protectionSurveyed = settingsData[big].protectionSurveyed;

    dataSurvey = (function(){
        var a;
        $.ajax({
            type: 'GET',
            url: config.currentDataLink,
            format: 'json',
            async: false,
            success: function(dataArgs){
                a = hxlProxyToJSON(dataArgs);

            }
        });
        return a;
    })();
    surveyData = crossfilter (dataSurvey);
    
    // generate dropdown menu selection based on availability on the sectors
    // if (prct == 'no') {
    //     $('.surveySelectionMenu').children().filter(function(index, option) {
    //         return option.value=="protection";
    //     }).hide();

    // } else {
    //     $('.surveySelectionMenu').children().filter(function(index, option) {
    //         return option.value=="protection";
    //     }).show();
    // }

    // if (fsl == 'no') {
    //     $('.surveySelectionMenu').children().filter(function(index, option) {
    //         return option.value=="foodSecurity";
    //     }).hide();

    // } else {
    //     $('.surveySelectionMenu').children().filter(function(index, option) {
    //         return option.value=="foodSecurity";
    //     }).show();
    // }

}//end initConfig


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
};



// Generate right sidebar charts and map
function generateCharts() {
    //var surveyData = crossfilter(data);

    var ethnicityChart = dc.rowChart('#ethnicity');
    // var occupationChart = dc.rowChart('#occupation');
    var householdStatusChart = dc.rowChart('#householdStatus');
    var genderChart = dc.pieChart('#gender');
    var ageChart = dc.barChart('#age');

    var whereChart = dc.leafletChoroplethChart('#map');

    var ethnicityDim = surveyData.dimension(function (d) {
        //console.log(d["#respondee+ethnicity"]);
        return d["#respondee+ethnicity"];
    });
    // var occupationDim = surveyData.dimension(function (d) {
    //     return d["Occupation"];
    // });
    var householdStatusDim = surveyData.dimension(function (d) {
        return d["#indicator+home_status"];
    });
    var genderDim = surveyData.dimension(function (d) {
        return d["#respondee+gender"];
    });
    var ageDim = surveyData.dimension(function (d) {
        return d["#respondee+age"];
    });

    var mapDim = surveyData.dimension(function (d) {
        return d["#adm2+code"];
    });
    var mapGroup = mapDim.group();

    var ethnicityGroup = ethnicityDim.group();
    // var occupationGroup = occupationDim.group();
    var householdStatusGroup = householdStatusDim.group();
    var genderGroup = genderDim.group();
    var ageGroup = ageDim.group();


    var all = surveyData.groupAll();

    //tooltip
    var rowtip = d3.tip().attr('class', 'd3-tip').html(function(d) { 
        str = "NA";
        if (parseInt(d.value) > 5) {
            str = d.key+': '+d3.format('0,000')(d.value);
        }
        return str;
    }); 


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
        .xAxis().ticks(5);


    // occupationChart.width(sideChartWidth)
    //     .height(function () {
    //         return computeChartHeight(occupationGroup);
    //     })
    //     .margins(chartMargins)
    //     .fixedBarHeight(chartBarHeight)
    //     .gap(chartBarGap)
    //     .dimension(occupationDim)
    //     .group(occupationGroup)
    //     .data(function (group) {
    //         return group.top(Infinity);
    //     })
    //     .colors(blue)
    //     .elasticX(true)
    //     .renderTitle(false)
    //     .xAxis().ticks(0);

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
        .xAxis().ticks(5);

    var genderColors = d3.scale.ordinal().range([blue, blueLight]);

    genderChart.width(350)
        .height(250)
        .radius(100)
        .dimension(genderDim)
        .group(genderGroup)
        .colors(genderColors)
        .title(function(d) {
            return;
        });;

    ageChart.width(350)
        .height(250)
        .margins({ top: 0, right: 10, bottom: 80, left: 10 })
        .dimension(ageDim)
        .group(ageGroup)
        .colors(blue)
        .elasticX(true)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
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
        });
       // .renderPopup(true);

    $('.viz-container').show();
    $('.loader').hide();
    
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
            .xAxis().ticks(5);
            
            chart.render();


        //tooltip events
        d3.selectAll('g.row').call(rowtip);
        d3.selectAll('g.row').on('mouseover', rowtip.show).on('mouseout', rowtip.hide);   
    }// end drawSurveyChart

    function generateSurveyCharts(selection){
        switch (selection) {
            case "foodSecurity":
                $('.surveycharts').html('<p>');

                for (k in foodSecDivs) {
                    $('.surveycharts').append('<div class="col-sm-6"><h5 style="width:350px;">'+foodSecDivs[k].question+'</h5><div id="foodSecurity'+k+'"></div></div>');
                    drawSurveyChart('foodSecurity', foodSecDivs[k].tag, k);
                }
                break;
            case "protection":
                $('.surveycharts').html('<p>');

                for (k in protectionDivs) {
                    $('.surveycharts').append('<div class="col-sm-6"><h5 style="width:350px;">'+protectionDivs[k].question+'</h5><div id="protection'+k+'"></div></div>');
                    drawSurveyChart('protection', protectionDivs[k].tag, k);
                }
                break;
            default:
                $('.surveycharts').html('<p>');

                for (k in reconstructionDivs) {
                    $('.surveycharts').append('<div class="col-sm-6"><h5 style="width:350px;">'+reconstructionDivs[k].question+'</h5><div id="reconstruction'+k+'"></div></div>');
                    drawSurveyChart('reconstruction', reconstructionDivs[k].tag, k);
                }
                break;
        }

    } //end generateSurveyCharts

    $('document').ready(function(){
        generateSurveyCharts();

    });

    $('.surveySelectionMenu').on('change', function(e){
        var selectedSurvey = $('.surveySelectionMenu').val();
        generateSurveyCharts(selectedSurvey);
    });


} // end generateCharts()

//
for (key in settingsData){
    settingsData[key].month != "" ? $('#collapse1').append('<div class="panel-body"><a href="#" id='+key+'>'+settingsData[key].month+'  '+settingsData[key].year+'</a></div>') : ''; 
};

$('.panel-body a').click(function(e){
    var id = $(this).attr('id');
    initConfig(id);
    $('.viz-container').hide();
    $('.loader').show();
    generateCharts();
});


var geodataCall = $.ajax({
    type: 'GET',
    url: 'data/map.json',
    dataType: 'json',
});

var settingsCall = $.ajax({
    type: 'GET',
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1trL6M1_ousu_G0p9qoMw65TrbrX-Zi2gAvOzankIOH0%2Fedit%23gid%3D487730406&force=on',
    dataType: 'json',
});

var sectionQuestionsCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1trL6M1_ousu_G0p9qoMw65TrbrX-Zi2gAvOzankIOH0%2Fedit%23gid%3D1270569691&force=on',
    //url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1trL6M1_ousu_G0p9qoMw65TrbrX-Zi2gAvOzankIOH0%2Fedit%23gid%3D0&force=on',
    dataType: 'json',
});



$.when(geodataCall,sectionQuestionsCall, settingsCall).then(function (geomArgs, sectorQuestionsArgs, settingsArgs) {
    geom = geomArgs[0];
    var dataSettings = hxlProxyToJSON(settingsArgs[0]);
    dataSettings.forEach( function(element) {
        settingsData[element['#meta+code']] = {'year': element['#date+year'], 'month': element['#date+month'], 'link': element['#meta+link'], 'fslSurveyed': element['#meta+fsl'], 'protectionSurveyed':element['#meta+protection']};
    });

    var sectorQuestions = hxlProxyToJSON(sectorQuestionsArgs[0]);
    var j = 0,
        k = 0,
        l = 0;

    sectorQuestions.forEach( function(element) {
        if (element['#sector'] == 'reconstruction') {
            reconstructionDivs[j] = {'question': element['#meta+question'], 'tag': element['#meta+tag']};
            j++;
            
        } else if (element['#sector'] == 'fsl') {
            foodSecDivs[k] = {'question': element['#meta+question'], 'tag': element['#meta+tag']};
            k++;
            
        } else {
            protectionDivs[l] = {'question': element['#meta+question'], 'tag': element['#meta+tag']};
            l++;
        }
    });

    generateCharts();

});


