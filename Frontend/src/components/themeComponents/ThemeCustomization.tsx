import { useMemo } from 'react';
import type { ReactNode } from 'react';
// material-ui
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ThemeOptions, Theme, TypographyVariantsOptions } from '@mui/material/styles';
// project import
import useConfig from "./useConfig";
import Palette from './palette';
import Typography from './typography';
import CustomShadows from './shadows';
import componentsOverride from './overrides';

// types
import type { CustomShadowProps } from './types/theme';
import React from 'react';
import {useLocaleConfig} from "@tcpos/backoffice-components";

// types
type ThemeCustomizationProps = {
    children: ReactNode;
};

// ==============================|| DEFAULT THEME - MAIN  ||============================== //

export default function ThemeCustomization({ children }: ThemeCustomizationProps) {
    const { themeDirection } = useLocaleConfig();
    const { mode, presetColor, fontFamily } = useConfig();

    const theme: Theme = useMemo<Theme>(() => Palette(mode, presetColor), [mode, presetColor]);

    const themeTypography: TypographyVariantsOptions = useMemo<TypographyVariantsOptions>(
        () => Typography(mode, fontFamily, theme),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mode, fontFamily]
    );
    const themeCustomShadows: CustomShadowProps = useMemo<CustomShadowProps>(() => CustomShadows(theme), [theme]);

    const themeOptions: ThemeOptions = useMemo(
        () => ({
            breakpoints: {
                values: {
                    xs: 0,
                    sm: 768,
                    md: 1024,
                    lg: 1266,
                    xl: 1536
                }
            },
            direction: themeDirection,
            mixins: {
                toolbar: {
                    minHeight: 60,
                    paddingTop: 8,
                    paddingBottom: 8
                }
            },
            palette: theme.palette,
            customShadows: themeCustomShadows,
            typography: themeTypography
        }),
        [themeDirection, theme, themeTypography, themeCustomShadows]
    );

    const themes: Theme = createTheme(themeOptions);
    themes.components = componentsOverride(themes);

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
