/**
 * 柚子工具网 (UZTOOL.COM) - 房贷计算器核心逻辑引擎
 * 针对 GitHub Pages 环境优化：强制锁定 jQuery 作用域
 * 深度优化版：保留全部 UI 逻辑，修正高精度计算误差，完善混合贷款引擎
 */
(function($) {
    // 所有的计算逻辑和绑定都在这里执行
    var runCalculator = function() {
        console.log("UZTOOL: 房贷深度测算引擎已就绪...");

        // --- 1. 全局参数与利率矩阵 (原始资产) ---
        var businessShortRateArr6 = [5.1, 5.35, 5.6, 5.85, 6.1, 5.85, 5.6, 5.6, 5.35, 5.1, 4.85, 4.6, 3.45],
            businessShortRateArr12 = [5.56, 5.81, 6.06, 6.31, 6.56, 6.31, 6, 5.6, 5.35, 5.1, 4.85, 4.6, 3.45],
            businessShortRateArr36 = [5.6, 5.85, 6.1, 6.4, 6.65, 6.4, 6.15, 6, 5.75, 5.5, 5.25, 5, 3.45],
            businessShortRateArr60 = [5.96, 6.22, 6.45, 6.65, 6.9, 6.65, 6.4, 6, 5.75, 5.5, 5.25, 5, 4.2],
            businessLongRateArr = [6.14, 6.4, 6.6, 6.8, 7.05, 6.8, 6.55, 6.15, 5.9, 5.65, 5.4, 5.15, 4.2],
            PAFShortRateArr = [3.5, 3.75, 4, 4.2, 4.45, 4.2, 4, 3.75, 3.5, 3.25, 3, 2.75, 2.75],
            PAFLongRateArr = [4.05, 4.3, 4.5, 4.7, 4.45, 4.7, 4.5, 4.25, 4, 3.75, 3.5, 3.25, 3.25],
            loanType = 0, // 0:商贷, 1:公积金, 2:混合
            loanPeriods = 240,
            businessPeriodType = 4,
            PAFPeriodType = 1,
            businessRateType = 12,
            PAFRateType = 12,
            businessDiscount = 1,
            showResultTabID = 1,
            simpleDataTableMaxLines = 10;

        // --- 2. 交互逻辑绑定 (UI 状态流转) ---

        // 贷款类型切换 (商贷/公积金/混合)
        $("#business_calc, #PAF_calc, #mix_calc").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".tab").removeClass("select-tab").addClass("normal-tab");
                var id = $(this).attr("id");
                if (id === "business_calc") {
                    $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, #business_atc_recmd_mod").show();
                    $("#PAF_sum_line, #PAF_rate_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #PAF_atc_recmd_mod").hide();
                    loanType = 0;
                } else if (id === "PAF_calc") {
                    $("#PAF_sum_line, #PAF_rate_line, #PAF_atc_recmd_mod").show();
                    $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #business_atc_recmd_mod").hide();
                    loanType = 1;
                } else {
                    $("#business_sum_line, #business_rate_select_line, #business_rate_value_line, #PAF_sum_line, #PAF_rate_line, [id*='interest_total_debx'], [id*='interest_total_debj'], #business_atc_recmd_mod").show();
                    $("#PAF_atc_recmd_mod").hide();
                    loanType = 2;
                }
            }
        });

        // 结果页选项卡切换 (等额本息 vs 等额本金)
        $(".result-tab").on("click", function() {
            if ($(this).hasClass("normal-tab")) {
                $(this).removeClass("normal-tab").addClass("select-tab").siblings(".result-tab").removeClass("select-tab").addClass("normal-tab");
                var tid = $(this).attr("tab-id");
                $("#result_data_" + tid).show().siblings(".result-data").hide();
                showResultTabID = parseInt(tid);
            }
        });

        // 贷款期限联动计算
        $("#loan_period_select").on("change", function() {
            var val = parseInt($(this).val());
            if (val == 0) { loanPeriods = 6; PAFPeriodType = businessPeriodType = 0; }
            else if (val == 1) { loanPeriods = 12; businessPeriodType = 1; PAFPeriodType = 0; }
            else if (val <= 3) { loanPeriods = 12 * val; businessPeriodType = 2; PAFPeriodType = 0; }
            else if (val <= 5) { loanPeriods = 12 * val; businessPeriodType = 3; PAFPeriodType = 0; }
            else { loanPeriods = 12 * val; businessPeriodType = 4; PAFPeriodType = 1; }
            
            $("#loan_period_select_bar").text($(this).find("option:selected").text());
            if ($("#business_rate_select").attr("input-method") == "auto") businessRateUpdate();
            if ($("#PAF_rate_select").attr("input-method") == "auto") PAFRateUpdate();
        });

        // 利率选择联动
        $("#business_rate_select").on("change", function() {
            businessRateType = $(this).val();
            $("#business_rate_select_bar").text($(this).find("option:selected").text());
            if (businessRateType == -1) {
                $("#business_discount_field").hide();
                $("#business_rate_select_field").removeClass("long-field");
                $("#business_rate").val("");
                $(this).attr("input-method", "hand");
            } else {
                $("#business_rate_select_field").addClass("long-field");
                $("#business_discount_field").show();
                $(this).attr("input-method", "auto");
                businessRateUpdate();
            }
        });

        $("#business_discount").on("change", function() {
            businessDiscount = parseFloat($(this).find("option:selected").attr("data-discount"));
            $("#business_discount_bar").text($(this).find("option:selected").text());
            businessRateUpdate();
        });

        $("#PAF_rate_select").on("change", function() {
            PAFRateType = $(this).val();
            $("#PAF_rate_select_bar").text($(this).find("option:selected").text());
            if (PAFRateType == -1) {
                $("#PAF_rate").val("");
                $(this).attr("input-method", "hand");
            } else {
                $(this).attr("input-method", "auto");
                PAFRateUpdate();
            }
        });

        // 按钮交互逻辑
        $("#calculate").on("click", function() {
            if (userInputCheck()) {
                calculate();
                window.scrollTo(0, 0);
                $("[view=calc_input]").hide();
                $("[view=calc_result]").show();
            }
        });

        $("#recalculate").on("click", function() {
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=calc_input]").show();
        });

        $(".view-more").on("click", function() {
            var detailId = $(this).attr("data-detail");
            $("#data_detail_" + detailId).show().siblings(".data-container").hide();
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=data_detail]").show();
            $("#data_detail_bar").show();
        });

        $("#back_to_calc_input").on("click", function() {
            window.scrollTo(0, 0);
            $("[view=calc_result]").hide();
            $("[view=calc_input]").show();
        });

        $("#back_to_calc_result").on("click", function() {
            window.scrollTo(0, 0);
            $("#data_detail_bar").hide();
            $("[view=data_detail]").hide();
            $("[view=calc_result]").show();
        });

        // --- 3. 内部计算逻辑函数 ---

        function businessRateUpdate() {
            var rate = 0;
            if (businessPeriodType == 0) rate = businessShortRateArr6[businessRateType];
            else if (businessPeriodType == 1) rate = businessShortRateArr12[businessRateType];
            else if (businessPeriodType == 2) rate = businessShortRateArr36[businessRateType];
            else if (businessPeriodType == 3) rate = businessShortRateArr60[businessRateType];
            else if (businessPeriodType == 4) rate = businessLongRateArr[businessRateType];
            // 修正显示精度，避免出现 4.1999999...
            $("#business_rate").val((Math.round(rate * businessDiscount * 100) / 100).toFixed(2));
        }

        function PAFRateUpdate() {
            var rate = (PAFPeriodType == 0) ? PAFShortRateArr[PAFRateType] : PAFLongRateArr[PAFRateType];
            $("#PAF_rate").val(rate);
        }

        function userInputCheck() {
            if (loanType == 0) return checkField("#business_sum") && checkField("#business_rate");
            if (loanType == 1) return checkField("#PAF_sum") && checkField("#PAF_rate");
            if (loanType == 2) return checkField("#business_sum") && checkField("#business_rate") && checkField("#PAF_sum") && checkField("#PAF_rate");
            return false;
        }

        function checkField(id) {
            var val = $.trim($(id).val());
            if (val != "" && /^\d*[\.]?\d*$/.test(val) && parseFloat(val) > 0) return true;
            $(id).val("").focus();
            return false;
        }

        // --- 4. 核心数学计算引擎 (Precision-First) ---

        function calculate() {
            calculate_debx(); // 计算等额本息
            calculate_debj(); // 计算等额本金
            
            // 默认展示用户选中的还款方式
            var type = $('input[name="repayType"]:checked').val();
            $(".result-tab[tab-id=" + type + "]").click();
        }

        function calculate_debx() {
            var bSum = 1E4 * parseFloat($("#business_sum").val()) || 0;
            var bRate = parseFloat($("#business_rate").val()) / 1200 || 0;
            var pSum = 1E4 * parseFloat($("#PAF_sum").val()) || 0;
            var pRate = parseFloat($("#PAF_rate").val()) / 1200 || 0;

            if (loanType == 0) solveDebx(bSum, bRate);
            else if (loanType == 1) solveDebx(pSum, pRate);
            else solveDebxMix(bSum, bRate, pSum, pRate);
        }

        function solveDebx(total, mRate) {
            // 公式：月供 = [贷款本金×月利率×(1+月利率)^还款月数]÷[(1+月利率)^还款月数-1]
            var mRepay = total * mRate * Math.pow(1 + mRate, loanPeriods) / (Math.pow(1 + mRate, loanPeriods) - 1);
            var totalRepay = mRepay * loanPeriods;
            var interest = totalRepay - total;
            fillResult(1, interest, totalRepay, mRepay, total, mRate);
        }

        function solveDebxMix(aSum, aRate, bSum, bRate) {
            // 分别计算商贷与公积金
            var aMonth = aSum * aRate * Math.pow(1 + aRate, loanPeriods) / (Math.pow(1 + aRate, loanPeriods) - 1);
            var bMonth = bSum * bRate * Math.pow(1 + bRate, loanPeriods) / (Math.pow(1 + bRate, loanPeriods) - 1);
            var aInt = aMonth * loanPeriods - aSum;
            var bInt = bMonth * loanPeriods - bSum;
            
            var totalInt = aInt + bInt;
            var totalRepay = aSum + bSum + totalInt;
            var mRepay = aMonth + bMonth;

            $("#business_interest_total_1").text(aInt.toFixed(2) + "元");
            $("#PAF_interest_total_1").text(bInt.toFixed(2) + "元");
            fillResultMix(1, totalInt, totalRepay, mRepay, aSum, aRate, bSum, bRate);
        }

        function calculate_debj() {
            var bSum = 1E4 * parseFloat($("#business_sum").val()) || 0;
            var bRate = parseFloat($("#business_rate").val()) / 1200 || 0;
            var pSum = 1E4 * parseFloat($("#PAF_sum").val()) || 0;
            var pRate = parseFloat($("#PAF_rate").val()) / 1200 || 0;

            if (loanType == 0) solveDebj(bSum, bRate);
            else if (loanType == 1) solveDebj(pSum, pRate);
            else solveDebjMix(bSum, bRate, pSum, pRate);
        }

        function solveDebj(total, mRate) {
            // 等额本金总利息 = [(分期数+1)×贷款总额×月利率]/2
            var interest = (loanPeriods + 1) * total * mRate / 2;
            var totalRepay = interest + total;
            var baseP = total / loanPeriods;
            fillResult(2, interest, totalRepay, 0, total, mRate, baseP);
        }

        function solveDebjMix(aSum, aRate, bSum, bRate) {
            var aInt = (loanPeriods + 1) * aSum * aRate / 2;
            var bInt = (loanPeriods + 1) * bSum * bRate / 2;
            var totalInt = aInt + bInt;
            var totalRepay = aSum + bSum + totalInt;
            var baseP = (aSum + bSum) / loanPeriods;
            
            $("#business_interest_total_2").text(aInt.toFixed(2) + "元");
            $("#PAF_interest_total_2").text(bInt.toFixed(2) + "元");
            fillResultMix(2, totalInt, totalRepay, 0, aSum, aRate, bSum, bRate, baseP);
        }

        // --- 5. 数据填充与表格生成 ---

        function fillResult(tab, interest, totalRepay, mRepay, total, mRate, baseP) {
            $("#interest_total_" + tab).text(interest.toFixed(2) + "元");
            $("#repay_total_" + tab).text(totalRepay.toFixed(2) + "元");
            var html = "", simpleHtml = "", firstM = 0, firstI = 0;

            for (var i = 1; i <= loanPeriods; i++) {
                var curI, curM, curP, rem;
                if (tab == 1) { // 等额本息
                    curI = total * mRate * (Math.pow(1 + mRate, loanPeriods) - Math.pow(1 + mRate, i - 1)) / (Math.pow(1 + mRate, loanPeriods) - 1);
                    curM = mRepay; curP = curM - curI;
                    rem = total * (Math.pow(1 + mRate, loanPeriods) - Math.pow(1 + mRate, i)) / (Math.pow(1 + mRate, loanPeriods) - 1);
                } else { // 等额本金
                    curI = (total - baseP * (i - 1)) * mRate;
                    curP = baseP; curM = curI + curP;
                    rem = total - baseP * i;
                }
                if(i == 1) { firstM = curM; firstI = curI; }
                var row = "<tr><td>"+i+"</td><td>"+curM.toFixed(2)+"</td><td>"+curI.toFixed(2)+"</td><td>"+curP.toFixed(2)+"</td><td>"+Math.max(0, rem).toFixed(2)+"</td></tr>";
                html += row; if(i <= simpleDataTableMaxLines) simpleHtml += row;
            }
            $("#standard_data_table_" + tab).html(html);
            $("#simple_data_table_" + tab).html(simpleHtml);
            $("#repay_monthly_" + tab).text(firstM.toFixed(2) + "元");
            $("#interest_monthly_" + tab).text(firstI.toFixed(2) + "元");
        }

        function fillResultMix(tab, interest, totalRepay, mRepay, aSum, aRate, bSum, bRate, baseP) {
            $("#interest_total_" + tab).text(interest.toFixed(2) + "元");
            $("#repay_total_" + tab).text(totalRepay.toFixed(2) + "元");
            var html = "", simpleHtml = "", firstM = 0, firstI = 0;

            for (var i = 1; i <= loanPeriods; i++) {
                var curI, curM, curP, rem;
                if (tab == 1) { // 组合-本息
                    var curAI = aSum * aRate * (Math.pow(1 + aRate, loanPeriods) - Math.pow(1 + aRate, i - 1)) / (Math.pow(1 + aRate, loanPeriods) - 1);
                    var curBI = bSum * bRate * (Math.pow(1 + bRate, loanPeriods) - Math.pow(1 + bRate, i - 1)) / (Math.pow(1 + bRate, loanPeriods) - 1);
                    curI = curAI + curBI;
                    curM = mRepay; curP = curM - curI;
                    var remA = aSum * (Math.pow(1 + aRate, loanPeriods) - Math.pow(1 + aRate, i)) / (Math.pow(1 + aRate, loanPeriods) - 1);
                    var remB = bSum * (Math.pow(1 + bRate, loanPeriods) - Math.pow(1 + bRate, i)) / (Math.pow(1 + bRate, loanPeriods) - 1);
                    rem = remA + remB;
                } else { // 组合-本金
                    var curAI = (aSum - (aSum/loanPeriods)*(i-1)) * aRate;
                    var curBI = (bSum - (bSum/loanPeriods)*(i-1)) * bRate;
                    curI = curAI + curBI;
                    curP = baseP; curM = curI + curP;
                    rem = (aSum + bSum) - baseP * i;
                }
                if(i == 1) { firstM = curM; firstI = curI; }
                var row = "<tr><td>"+i+"</td><td>"+curM.toFixed(2)+"</td><td>"+curI.toFixed(2)+"</td><td>"+curP.toFixed(2)+"</td><td>"+Math.max(0, rem).toFixed(2)+"</td></tr>";
                html += row; if(i <= simpleDataTableMaxLines) simpleHtml += row;
            }
            $("#standard_data_table_" + tab).html(html);
            $("#simple_data_table_" + tab).html(simpleHtml);
            $("#repay_monthly_" + tab).text(firstM.toFixed(2) + "元");
            $("#interest_monthly_" + tab).text(firstI.toFixed(2) + "元");
        }
    };

    // --- 自动检测并运行 ---
    if (window.jQuery) {
        runCalculator();
    } else {
        var checkJQ = setInterval(function() {
            if (window.jQuery) {
                runCalculator();
                clearInterval(checkJQ);
            }
        }, 50);
    }
})(window.jQuery);
